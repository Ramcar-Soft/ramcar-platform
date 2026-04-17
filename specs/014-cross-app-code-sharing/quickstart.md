# Quickstart: Cross-App Shared Feature Modules

**Feature**: 014-cross-app-code-sharing
**Audience**: Platform engineers working on features that live in both `apps/web` and `apps/desktop`.

This is a how-to for the common tasks you'll perform after the pilot (`visitors`) has been migrated to `@ramcar/features`.

---

## The one-minute mental model

- Before: features were authored twice — once in `apps/web/src/features/<X>/`, once in `apps/desktop/src/features/<X>/`. Primitives were copy-pasted between each app's `src/shared/components/`.
- After: bi-app features live in `@ramcar/features/<X>/`. Each app imports from there and wires three adapters (transport, i18n, role) plus any platform-specific slots.
- The CI check (`scripts/check-shared-features.ts`) enforces this — once a feature is in `shared-features.json`, reintroducing a component under `apps/*/src/features/<migrated-feature>/` fails the build.

## Package graph (memorize this)

```text
apps/web ──────┐
apps/desktop ──┼──▶ @ramcar/features ──▶ @ramcar/ui
               │                    ├▶ @ramcar/shared  (Zod)
               │                    ├▶ @ramcar/store   (Zustand slices)
               │                    └▶ @ramcar/i18n    (messages)
               └ (adapters: transport, i18n, role)
```

---

## Task 1 — Add a new field to a shared feature (the common case)

Scenario: add a `phoneNumber` field to the visitor-create sidebar form. Both apps should show it.

1. **Update the Zod schema** in `@ramcar/shared/src/validators/visit-person.ts` (add `phoneNumber: z.string().optional()`).
2. **Regenerate anything downstream** (`pnpm typecheck` will surface type drift).
3. **Edit the shared form** in `packages/features/src/visitors/components/visit-person-form.tsx`:
   - Add the input (use `@ramcar/ui` primitives, no `next/*`, no `"use client";`).
   - Use `t("visitPersons.form.phoneNumber")` — full dotted key.
   - Route the value through the existing draft/submit flow.
4. **Add the translation** to `@ramcar/i18n/src/messages/en.json` and `es.json` under `visitPersons.form.phoneNumber`. DO NOT add it to either app's message files.
5. **Update the API** (if the field is persisted) via the existing NestJS + Postgres migration flow — no change to this feature's pattern.
6. **Verify both apps** — see Task 3.

You are NOT editing `apps/web/src/features/visitors/` or `apps/desktop/src/features/visitors/` — those directories are empty (only `index.ts` re-exports from `@ramcar/features/visitors`, if they exist at all).

---

## Task 2 — Change a shared behavior (the next common case)

Scenario: tighten a validation rule in the visit-person form.

1. Open `packages/shared/src/validators/visit-person.ts`.
2. Update the Zod schema. (Server-side NestJS validation uses the same schema — no duplicate edit.)
3. If the form needs to surface a different error message, update the message in `@ramcar/i18n`.
4. Run `pnpm typecheck` and `pnpm test` from the repo root.
5. Both apps will reflect the rule on next build. Verify in the UI (Task 3).

---

## Task 3 — Verify both apps after a shared change

```bash
# From repo root:
pnpm dev
# → launches apps/web (Next.js), apps/desktop (Electron), apps/api (NestJS), and apps/www in parallel.

# Or per-app:
pnpm --filter @ramcar/web dev
pnpm --filter @ramcar/desktop dev
```

Then:
- Web: open `http://localhost:3000/visitors`, walk the create flow.
- Desktop: interact with the Electron window that appears, navigate to `/visitors`, walk the create flow.
- Both must show the new field/behavior.

Unit tests:

```bash
pnpm --filter @ramcar/features test          # shared component unit tests
pnpm --filter @ramcar/web test               # web integration tests
pnpm --filter @ramcar/desktop test           # desktop integration tests
```

A passing `@ramcar/features` test is evidence both host apps' contract is upheld.

---

## Task 4 — Inject a platform-specific UI detail (deliberate divergence)

Scenario: show an offline/sync badge on the visitors table header on desktop only.

Pick the right mechanism:

- **UI injection** (adding a DOM node) → use a slot prop.
- **Behavior injection** (a callback, a hook) → use a typed callback/adapter prop.
- **Cross-cutting** (i18n, transport, role) → use the respective adapter, not a slot.

Desktop booth (offline badge = UI → slot):

```tsx
// apps/desktop/src/features/visitors/pages/visitors-page.tsx
import { VisitorsView } from "@ramcar/features/visitors";
import { SyncBadge } from "@/shared/components/sync-badge";

export function VisitorsPage() {
  return <VisitorsView topRightSlot={<SyncBadge />} />;
}
```

Web portal (admin-only action on each row = UI gated by role → slot + host-side role check):

```tsx
// apps/web/src/app/[locale]/(authenticated)/visitors/page.tsx
"use client";
import { VisitorsView } from "@ramcar/features/visitors";
import { useRole } from "@/shared/lib/features/role";
import { AdminReassignButton } from "@/features/visitors-admin-actions";

export default function VisitorsPage() {
  const { role } = useRole();
  return (
    <VisitorsView
      trailingAction={role === "Admin" ? <AdminReassignButton /> : null}
    />
  );
}
```

Web portal (restore in-progress form draft after reload = behavior → callback adapter):

```tsx
// apps/web/src/app/[locale]/(authenticated)/visitors/page.tsx (or a client child)
const { draft, setDraft } = useFormPersistence("visit-person-create");
return (
  <VisitorsView
    initialDraft={draft}
    onDraftChange={setDraft}
  />
);
```

Desktop does not supply `initialDraft` / `onDraftChange`; draft recovery is a browser concern and the booth doesn't need it.

---

## Task 5 — Wire a new host app against `@ramcar/features`

(You only do this once per host — it's already done for web and desktop. Included here for reference when a third host shows up, e.g., a future admin console.)

Each host mounts three providers and a store provider at its root:

```tsx
<I18nProvider value={webI18nImpl}>
  <TransportProvider value={webTransportImpl}>
    <RoleProvider value={webRoleImpl}>
      <StoreProvider>
        <QueryClientProvider client={queryClient}>
          {/* app content, including shared features */}
        </QueryClientProvider>
      </StoreProvider>
    </RoleProvider>
  </TransportProvider>
</I18nProvider>
```

Where each adapter comes from:

| Port | Web adapter | Desktop adapter |
|---|---|---|
| `TransportPort` | wraps `apps/web/src/shared/lib/api-client.ts` | wraps `apps/desktop/src/shared/lib/api-client.ts`; free to route writes through `window.electron.sync.enqueue(...)` |
| `I18nPort` | wraps `next-intl`'s `useTranslations()` (flattens key namespaces) | wraps `react-i18next`'s `useTranslation()` |
| `RolePort` | reads from `@supabase/ssr` session + user metadata | reads from the persisted desktop session (spec 001) |

---

## Task 6 — Migrate a new feature to `@ramcar/features`

Scenario: migrate `residents` after `visitors` has landed.

1. **Copy** the three layers into `packages/features/src/residents/`:
   - primitives in use (if any) → `packages/features/src/shared/` (if not already moved)
   - feature components → `packages/features/src/residents/components/`
   - hooks → `packages/features/src/residents/hooks/`
2. **Strip web/desktop-specific bits**: `"use client";`, `next/*`, `window.electron`, relative `../../../shared/...` imports, direct `useTranslations` / `useTranslation` calls. Replace with the three adapters.
3. **Consolidate i18n keys** into `@ramcar/i18n/src/messages/{en,es}.json`. Remove per-app duplicates.
4. **Add the store slice** (`residents-slice.ts`) in `packages/store/src/slices/` and register it in `packages/store/src/index.tsx`.
5. **Export** from `packages/features/src/index.ts`: `export * from "./residents";`.
6. **Wire host pages**:
   - `apps/web/src/app/[locale]/(authenticated)/residents/page.tsx` imports `ResidentsView` from `@ramcar/features/residents`.
   - `apps/desktop/src/features/residents/pages/residents-page.tsx` imports the same.
7. **Delete** `apps/web/src/features/residents/` and `apps/desktop/src/features/residents/` contents (leave only page-level wiring if it must remain, and register that path in `shared-features.json` `allowList`).
8. **Update the manifest** — add an entry:
   ```json
   {
     "name": "residents",
     "migratedAt": "YYYY-MM-DD",
     "package": "@ramcar/features/residents"
   }
   ```
9. **Run the CI check locally**:
   ```bash
   pnpm --filter root run check:shared-features
   ```
   Should pass.
10. **Verify** both apps render and behave identically against the pre-migration acceptance tests for the `residents` feature.

---

## Task 7 — Understand a CI failure from the duplication check

Example output you might see on a PR:

```text
❌ Shared features duplication check failed.

The feature "visitors" is listed in shared-features.json but the following
files exist under apps/*/src/features/visitors/ and are not pure re-exports:

  - apps/web/src/features/visitors/components/visit-person-form.tsx
  - apps/desktop/src/features/visitors/hooks/use-create-visit-person.ts

Move them to @ramcar/features/visitors and import from there, or add an
exemption to shared-features.json "allowList" with a PR note.

See specs/014-cross-app-code-sharing/ for the full pattern.
```

Typical causes and fixes:

| Cause | Fix |
|---|---|
| New component was authored in the old app-local path | Move to `packages/features/src/<feature>/components/`; delete the app-local copy. |
| Old file wasn't deleted during the migration PR | Delete it. |
| You genuinely need a page-only wrapper in the app | Add the path to `shared-features.json` `allowList` (with a note) and explain in the PR. |

---

## Red flags — if you see any of these, stop and reconsider

- A file in `@ramcar/features/` that starts with `"use client";` — remove it. The directive has no meaning outside Next.js RSC and is misleading here.
- A file in `@ramcar/features/` that imports from `next/*`, `window.electron`, or `@supabase/supabase-js` (other than types) — these are forbidden by the package ESLint config.
- A shared hook calling `fetch(...)` directly — route through `useTransport()`.
- A shared component calling `useTranslations()` or `useTranslation()` directly — use `useI18n()`.
- A shared component branching on `role` to decide what to render — move the decision to the host and pass a slot.
- A string duplicated in both `apps/web/src/messages/*.json` and `apps/desktop/src/locales/*.json` for a migrated feature — move it to `@ramcar/i18n`.

---

## Where to look

- Package source: `packages/features/src/`
- Host adapter source: `apps/web/src/shared/lib/features/` and `apps/desktop/src/shared/lib/features/`
- Manifest: `shared-features.json` at workspace root
- CI script: `scripts/check-shared-features.ts`
- Full contracts: `specs/014-cross-app-code-sharing/contracts/`
- Schema for the manifest (for editor tooling): `specs/014-cross-app-code-sharing/contracts/shared-features-manifest.schema.json`
