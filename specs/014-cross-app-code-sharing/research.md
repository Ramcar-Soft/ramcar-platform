# Phase 0 — Research: Cross-App Shared Feature Modules

**Feature**: 014-cross-app-code-sharing
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)
**Date**: 2026-04-17

This file resolves open questions surfaced while filling the Technical Context in `plan.md`. Each section records the decision, the rationale, and the alternatives considered. The spec's own Clarifications section already resolved Q1 (package boundary), Q2 (duplication-detection mechanism), Q3 (extension-point pattern), and Q4 (feature-scoped state home); research below takes those as settled and resolves the remaining implementation-level unknowns.

---

## 1. Exact name and boundary of the new workspace package

**Decision**: `@ramcar/features` — a new sibling workspace package under `packages/features/`. `@ramcar/ui` stays primitives-only.

**Rationale**:
- Confirmed by spec clarification Q1: "A new dedicated sibling workspace package."
- `@ramcar/ui` is a domain-agnostic primitives library intended for reuse beyond these two apps (mobile, internal tools). Folding feature slices into it would break that reuse contract and violate Constitution Principle II (Feature-Based Architecture — features are vertical slices, not primitives).
- Sibling placement makes the dependency graph unidirectional: `@ramcar/features` depends on `@ramcar/{ui, shared, store, i18n}`; none of those depend on `@ramcar/features`. This matches Principle III (Strict Import Boundaries).
- Name `features` is short, matches the existing `src/features/` naming inside each app, and reads intuitively at import sites: `import { VisitorsView } from "@ramcar/features/visitors"`.

**Alternatives considered**:
- `@ramcar/app-features` (more explicit but longer; `features` is already contextual within the monorepo).
- `@ramcar/modules` (clashes conceptually with NestJS "modules"; rejected).
- Extend `@ramcar/ui` with a `features/` subdirectory (rejected per Q1).
- Split per-feature packages (`@ramcar/visitors`, `@ramcar/residents`, ...) — rejected: excessive pnpm ceremony, no independent release cadence wanted, and the CI manifest is easier to maintain against one package.

---

## 2. Transport adapter contract

**Decision**: A small verb-based TypeScript interface exposed as `TransportPort`, obtained by shared hooks via a React context hook `useTransport()`. Each host app ships an adapter that implements it. Shared TanStack Query hooks never call `fetch` directly.

```ts
// packages/features/src/adapters/transport.ts (sketch — final contract lives in contracts/feature-transport-port.ts)
export interface TransportPort {
  get<T>(path: string, options?: { params?: Record<string, unknown>; signal?: AbortSignal }): Promise<T>;
  post<T>(path: string, data?: unknown, options?: { signal?: AbortSignal }): Promise<T>;
  patch<T>(path: string, data?: unknown, options?: { signal?: AbortSignal }): Promise<T>;
  put<T>(path: string, data?: unknown, options?: { signal?: AbortSignal }): Promise<T>;
  delete<T>(path: string, options?: { signal?: AbortSignal }): Promise<T>;
  upload<T>(path: string, formData: FormData, options?: { signal?: AbortSignal }): Promise<T>;
}
```

- **Web host adapter**: `<WebTransportProvider>` wraps the existing `apiClient` in `apps/web/src/shared/lib/api-client.ts`. The mapping is near-identity today.
- **Desktop host adapter**: `<DesktopTransportProvider>` wraps `apiClient` today for reads. For writes, the desktop adapter is free to route through `window.electron.sync.enqueue(operation, payload)` (the existing outbox path defined by the SyncEngine) without the shared module being aware. This is the contract mechanism for Constitution Principle IV.

**Rationale**:
- FR-006 requires the shared hooks to be transport-agnostic. A React-context-injected interface is the simplest and most idiomatic mechanism in a React codebase that already uses providers for TanStack Query, theme, and store.
- Verb-based (get/post/patch/put/delete/upload) rather than a single `request(config)` method because the existing `apiClient` surface is already verb-based in both apps; the mapping is direct with no invention.
- `signal: AbortSignal` is included so TanStack Query's cancellation passes through to the host adapter.

**Alternatives considered**:
- Pass `apiClient` as a prop to every shared hook/component (verbose, noisy, and leaks transport concerns into every call site).
- Use a Zustand slice for transport (state management is wrong tool for a service locator; violates the "no overlap between TanStack Query and Zustand" rule).
- Use a module-level singleton registered via a `setTransport()` function (rejected: opaque, test-hostile, and forbids two simultaneous transports in tests).

---

## 3. i18n adapter contract

**Decision**: A single `I18nPort` shape exposed as `useI18n()` returning `{ t, locale }`, where `t(key, values?)` is a `(key: string, values?: Record<string, string | number>) => string`. Each host wires the concrete library behind this contract: web via `next-intl`'s `useTranslations()`, desktop via `react-i18next`'s `useTranslation()`. Messages continue to live in `@ramcar/i18n` (single source of truth, per FR-005).

**Rationale**:
- FR-004 forbids direct dependency on either i18n library. A `t(key, values?)` + `locale` shape is the minimum the shared forms need (they already use a flat `t("visitPersons.form.fullName")` style today, verified by inspecting the pilot source).
- Keeping the contract narrow lets the host map key lookup however it wants. `next-intl`'s nested `useTranslations("visitPersons.form")` scoping is collapsed in the adapter into a flat key lookup at the shared module — the shared module always passes full dotted keys.
- Plural and ICU message handling is not required by the pilot — both current implementations use simple string interpolation. If a future feature needs plurals, the adapter can be extended with `tn(key, count, values?)`.

**Alternatives considered**:
- Mirror `next-intl`'s scoped `useTranslations("ns")` API exactly (rejected: forces desktop's `react-i18next` to emulate scoping, which is awkward and lossy).
- Ship a neutral i18n library (e.g., `lingui`) inside `@ramcar/features` (rejected by FR-014: "MUST NOT introduce a new i18n library").
- Use React context with a plain object of key→value (rejected: defeats the runtime locale selection each host already supports).

---

## 4. Role / tenant adapter contract

**Decision**: A `RolePort` exposed as `useRole()` returning `{ role: Role, tenantId: string, userId: string }` (Role is the existing `SuperAdmin | Admin | Guard | Resident` union from `@ramcar/shared`). Each host wires it from its existing session source (web: `@supabase/ssr` session cookie; desktop: locally persisted session per spec 001).

**Rationale**:
- Constitution Principle VI requires role-gated UI to live at the host. The shared module needs tenant + role + user id for query keys (`[resource, tenantId, ...]`) and occasional conditional UI, but must not discover them by any other path.
- `tenantId` and `userId` are colocated on the same context because every shared hook needs at least one of them; a single hook call at the top of a shared component is cheaper than three context subscriptions.
- Role is an enum from `@ramcar/shared`, so the shared module stays framework-free and only depends on a type, not on a session library.

**Alternatives considered**:
- Derive tenant from a separate `useTenant()` (splits what is always requested together; no benefit).
- Pass tenant via a TanStack Query "default query options" meta (rejected: invisible to humans reading the call sites).

---

## 5. Feature-scoped client state — where does `visitorsSlice` live?

**Decision**: Extend `@ramcar/store` with a new slice `visitorsSlice` (sidebar open/close, selected row, active tab). Register it in `AppState` in `packages/store/src/index.tsx`. Shared components consume it via the existing `useAppStore(selector)` hook. `@ramcar/features` does NOT create its own Zustand store.

**Rationale**:
- Confirmed by spec clarification Q4: "Extend `@ramcar/store` with feature-scoped slices."
- `@ramcar/store` already composes slices via `StateCreator` (see `sidebar-slice.ts`, `sync-slice.ts`); adding `visitors-slice.ts` follows the established pattern.
- Each host app already renders exactly one `<StoreProvider>` at its root. Adding the slice does not change wiring, does not add a second store, and does not require per-app work.

**Alternatives considered**:
- Create a per-feature store inside `@ramcar/features/src/visitors/` (rejected — two stores in the same render tree would be confusing and would make the `useAppStore` pattern inconsistent).
- Use React context only (rejected — Zustand already handles this state kind across the app; introducing a second mechanism fragments the state story).

---

## 6. Slot prop pattern for platform-specific UI

**Decision**: Typed `ReactNode` slot props at a small set of documented positions. Each shared component declares its slots in TSDoc. The canonical slot names are:

| Slot name | Position | Typical use |
|---|---|---|
| `topRightSlot` | Header/toolbar top right | Desktop-only sync badge, web-only "Export CSV" |
| `trailingAction` | Row or card right edge | Web-only admin actions on a visitor row |
| `afterFields` | Below the last field of a form, before submit bar | Web-only `useFormPersistence` recovery banner |
| `emptyState` | When a table/list is empty | App-specific empty-state illustration/CTA |
| `headerSlot` | Above a content section | Platform-specific banner |

**Rationale**:
- Confirmed by spec clarification Q3: "Typed slot props with a documented naming convention."
- Slots are explicit (visible at the call site), greppable (every consumer references the name), and TypeScript-autocomplete-friendly (hover reveals TSDoc). Composition is natural JSX and does not require an external plugin system.
- Slots are **reserved for UI injection**. Cross-cutting concerns (i18n, data transport, role/tenant) continue to flow through React context adapters (§§2–4 above), not through slots.

**Alternatives considered**:
- A generic `renderProps` bag (rejected: too loose, autocomplete gets noisy, and any refactor of the shared component silently breaks callers).
- A plugin/registry pattern (rejected: overkill for a 3-app problem; increases surface area without need).
- Inheritance (`extends`) (rejected: React composition is preferred over subclassing).

---

## 7. Detecting and preventing re-duplication — CI mechanism

**Decision**: A `scripts/check-shared-features.ts` Node script driven by a workspace-root `shared-features.json` manifest. The script fails with a non-zero exit and an actionable message when any `apps/web/src/features/<X>/` or `apps/desktop/src/features/<X>/` directory contains `.ts` or `.tsx` files (other than re-exports of `@ramcar/features/<X>`) for any feature `X` listed in the manifest. Wired into `turbo.json` as `check:shared-features` and into the existing GitHub Actions CI pipeline.

**Manifest shape** (authoritative form lives at `contracts/shared-features-manifest.schema.json`):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "features": [
    { "name": "visitors", "migratedAt": "2026-04-17", "package": "@ramcar/features/visitors" }
  ],
  "allowList": []
}
```

**Rationale**:
- Confirmed by spec clarification Q2: "A CI check driven by a shared-features manifest."
- A script is easier to author and maintain than an ESLint rule. An ESLint rule would need AST traversal to distinguish a pure re-export (`export * from "@ramcar/features/visitors"`) from a reintroduced implementation; the script can check that directly with a small set of AST rules using `typescript` compiler APIs or `jscodeshift` — but simpler: the pilot rule is "the directory must contain nothing except `index.ts` that re-exports, or must be deleted entirely."
- The script emits a failure message that names the offending path, the migrated feature, and a direct link to the shared slice — making the fix self-evident.
- PR checklist alone (without CI) was rejected because it decays.

**Alternatives considered**:
- ESLint rule only (higher authoring cost, harder to keep in sync with manifest).
- Git pre-commit hook (runs locally only; CI is the non-bypassable gate).
- Codeowners file blocking merges (doesn't tell the author what is wrong).

---

## 8. Test harness for `@ramcar/features`

**Decision**: Vitest + jsdom, with a small test harness that renders a shared component inside mock providers:

```tsx
<I18nProvider value={mockI18n}>
  <TransportProvider value={mockTransport}>
    <RoleProvider value={mockRole}>
      <StoreProvider>{children}</StoreProvider>
    </RoleProvider>
  </TransportProvider>
</I18nProvider>
```

Host apps keep their own integration and E2E tests; the shared package is responsible for its own unit tests, and a passing unit test here is evidence that both host apps are protected (because both wire the same contract).

**Rationale**:
- Matches the testing stack already in place at `@ramcar/store`, `@ramcar/ui`, and both apps (Vitest + jsdom; React Testing Library).
- Mock providers give tests full control over transport behavior (simulate network errors, cancellation, slow responses) without touching real HTTP.
- One source of truth for component behavior tests. Each host app still runs its own smoke/E2E to prove wiring correctness (adapter, provider order, layout).

**Alternatives considered**:
- Render shared components inside each host app's test harness (rejected: duplicates the test authoring effort and undermines the "share the test too" benefit).
- Storybook-only documentation (complementary, not a substitute for assertive tests; can be added later).

---

## 9. Incremental migration sequencing

**Decision**: Pilot migration = `visitors` (all three layers in one PR: the duplicated `src/shared/components/*` primitives, the feature-level components, and the TanStack Query hooks). After pilot ships, `residents` follows in a separate PR, then `providers`. No big-bang migration.

**Rationale**:
- Confirmed by spec clarification Q2 (from the spec's own Resolved Clarifications section): "all three layers together in the pilot."
- Within a feature, moving partial layers forces temporary back-and-forth imports (`apps/web/src/features/visitors/components/visit-person-form.tsx` imports from `@ramcar/features/shared/image-capture`) that would be removed again at the next migration pass. Doing one feature end-to-end avoids churn.
- Across features, one at a time is the standard incremental pattern and allows validating the pilot before committing to the rest.

**Alternatives considered**:
- Big-bang (migrate all three features at once) — rejected: PR size, review risk, merge conflicts with in-flight visitor work (spec 013).
- Primitives-first pass (migrate `vehicle-form`, `image-capture`, etc. ahead of any feature slice) — rejected: leaves feature components still duplicated across both apps pulling from the new shared primitives, so the core duplication problem is not addressed in the pilot.

---

## 10. Bundler / TypeScript compatibility

**Decision**: `@ramcar/features` ships as TypeScript sources (no build step), with `package.json` pointing `main`/`types`/`exports` at the `.ts`/`.tsx` files inside `src/`. Next.js consumes it via its built-in `transpilePackages: ["@ramcar/features"]` option in `next.config.mjs` (the web app already uses this for `@ramcar/ui`, `@ramcar/store`, `@ramcar/shared`). Vite (desktop) consumes it directly because Vite resolves workspace TS files via `@vitejs/plugin-react` + esbuild.

**Rationale**:
- Matches how `@ramcar/ui`, `@ramcar/store`, `@ramcar/shared`, and `@ramcar/i18n` ship today — no new build tooling introduced.
- Avoids the complexity of emitting `.d.ts` + `.js` + sourcemaps and dealing with dual-publish (CJS/ESM) for a workspace-internal package.
- Tree-shaking works naturally: each slice has its own subpath export (`@ramcar/features/visitors`, `@ramcar/features/shared/image-capture`) so pages only pull in what they import.

**Subpath exports** (final list in `packages/features/package.json`):
```json
{
  "exports": {
    ".": "./src/index.ts",
    "./adapters": "./src/adapters/index.ts",
    "./visitors": "./src/visitors/index.ts",
    "./shared/*": "./src/shared/*/index.ts"
  }
}
```

**Alternatives considered**:
- Pre-built `dist/` with `tsup` (rejected — adds a build step, no benefit at this scale).
- Single barrel import only (rejected — defeats tree-shaking and forces consumers to pull in all features for a single screen).

---

## 11. ESLint rules inside `@ramcar/features`

**Decision**: Extend `@ramcar/config/eslint` with a package-local override that:
- Bans `next/*`, `"use client"` directive (React 19 allows this directive but it has no meaning outside Next.js RSC), and any filename/symbol import from `window.electron`.
- Bans direct `fetch` calls (forces use of the injected transport).
- Bans direct `@supabase/supabase-js` imports (API-First Principle VIII).
- Bans cross-slice imports (`src/visitors/*` must not import from `src/residents/*`).
- Bans imports from `@ramcar/features/*/internals/*` outside the owning slice (internals are package-private).

**Rationale**:
- These rules encode constitution principles III, IV, and VIII at the package level, preventing regressions during implementation.
- `no-restricted-imports` + `no-restricted-syntax` cover all of the above without custom ESLint plugins.

**Alternatives considered**:
- Rely on code review (rejected — recoverable, but not self-enforcing).
- Author a custom ESLint plugin (`@ramcar/eslint-plugin-features`) — deferred until the simpler restricted-imports ruleset proves insufficient.

---

## 12. Handling the deliberate web-only `useFormPersistence`

**Decision**: `useFormPersistence` stays in `apps/web/src/shared/hooks/use-form-persistence.ts` and is **not** moved to `@ramcar/features`. The shared `VisitPersonForm` component exposes two lifecycle hooks via adapter shape (not slots):

```ts
interface VisitPersonFormLifecycle {
  onDraftChange?: (draft: VisitPersonDraft) => void;
  initialDraft?: VisitPersonDraft;
}
```

- The **web host** wraps the shared form with a small shell component that calls `useFormPersistence(...)` and wires `onDraftChange` + `initialDraft` into it.
- The **desktop host** renders the shared form without supplying these props, and no persistence behavior occurs.

**Rationale**:
- The user explicitly called out `useFormPersistence` as a deliberate web-only divergence (spec §"Resolved Clarifications"). Shared-module code must not silently add browser-reload-recovery to desktop.
- An adapter shape (typed callback props) is cleaner than slots here because the need is for *behavior*, not for injecting UI. Slots are for UI; callbacks are for behavior. This keeps the mental model sharp.
- Keeping `useFormPersistence` in `apps/web` (not `@ramcar/features`) means the shared package does not depend on a hook that is irrelevant to the booth.

**Alternatives considered**:
- Move `useFormPersistence` into `@ramcar/features/shared/` and gate it with a `enabled: boolean` prop (rejected — the hook is browser-specific and its mere inclusion in the shared bundle is unnecessary for desktop; also blurs the "web-only on purpose" signal).
- Keep `useFormPersistence` in `@ramcar/features` and have desktop pass `enabled: false` (same rejection — ships code to desktop that does nothing).

---

## 13. Handling the deliberate desktop-only offline write path

**Decision**: No change to the shared mutation hook signature. The transport adapter (§2) is the single extension point for this concern. The desktop host's `<DesktopTransportProvider>` is free to route `post("/visit-persons", ...)` through the outbox + SyncEngine instead of going straight to HTTP. The shared hook doesn't know, doesn't care, and continues to use `queryClient.invalidateQueries(...)` on success — which fires whether the write was online or enqueued.

**Rationale**:
- The desktop outbox path is the canonical example of why Constitution Principle IV exists. The adapter pattern isolates it cleanly.
- Today (as of spec 013) the desktop renderer calls `apiClient.post(...)` directly — the outbox is only used for spec 011's offline-create flow. The adapter is ready for the outbox path without requiring it right now; the migration does not regress the current desktop behavior.

**Alternatives considered**:
- Add a `onOfflineQueued` callback to shared mutation hooks (rejected — couples the shared hook to a specific transport capability; adapter already lets the host decide).
- Two transport ports, one "online," one "offline" (rejected — the host already knows when to route through the outbox; a single port that internally delegates is simpler).

---

## 14. Handling role-gated UI for migrated features

**Decision**: Shared components render the default UI for all roles. Role-gated additions (admin-only re-assign action, for example) are injected by the host app into the `trailingAction` slot after calling `useRole()` in the host shell around the shared view.

Example (web):
```tsx
// apps/web/src/app/[locale]/(authenticated)/visitors/page.tsx
import { VisitorsView } from "@ramcar/features/visitors";
import { useRole } from "@/shared/lib/session";
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

**Rationale**:
- Keeps role decisions at the host (Principle VI).
- Keeps the shared module role-unaware (easier to test, easier to reason about).
- Makes the divergence visible in the host page, not hidden inside a shared component.

**Alternatives considered**:
- Shared component reads `useRole()` itself and conditionally renders (rejected — moves policy into the shared layer, which is exactly the coupling Principle VI forbids).

---

## 15. Migration impact on the existing `i18n` catalogs

**Decision**: User-facing strings used by the pilot `visitors` feature live in `@ramcar/i18n/src/messages/{en,es}.json` under the existing `visitPersons.*` and `common.*` namespaces. Audit the current web and desktop locale files for keys used by the migrated components and ensure they all exist (once) in `@ramcar/i18n`. Remove any per-app duplicates.

**Rationale**:
- FR-005: strings used by shared features MUST be defined in exactly one place.
- `@ramcar/i18n` already holds `visitPersons.*` keys (verified by reading `packages/i18n/src/messages/en.json` through the existing web/desktop locale pipelines); this is an audit-and-deduplicate exercise, not a schema change.

**Alternatives considered**:
- Introduce namespaced files inside `@ramcar/i18n` per feature (e.g., `messages/en/visitors.json`) — deferred; not required for the pilot and adds migration work. Revisit if message files get unwieldy.

---

## Summary of decisions

| # | Area | Decision |
|---|---|---|
| 1 | Package boundary | `@ramcar/features`, sibling to `@ramcar/ui`, primitives-only `@ramcar/ui` |
| 2 | Transport | Verb-based `TransportPort` via React context adapter |
| 3 | i18n | Minimal `I18nPort` (`t`, `locale`) via React context adapter |
| 4 | Role | `RolePort` (`role`, `tenantId`, `userId`) via React context adapter |
| 5 | Client state | Feature-scoped slices in `@ramcar/store`, consumed via `useAppStore` |
| 6 | Platform UI | Typed `ReactNode` slot props at documented positions |
| 7 | Drift detection | Node script + `shared-features.json`, wired into CI |
| 8 | Test harness | Vitest + jsdom with mock providers; host E2E untouched |
| 9 | Migration order | Pilot `visitors` (all three layers) → `residents` → `providers` |
| 10 | TS/bundler | Ship TS sources; `transpilePackages` on web; Vite-native on desktop |
| 11 | ESLint | Package-local `no-restricted-imports`/`no-restricted-syntax` for the rules above |
| 12 | Web-only `useFormPersistence` | Stays in `apps/web`, wired via adapter callbacks on the shared form |
| 13 | Desktop outbox path | Hidden behind the transport adapter; shared hook unchanged |
| 14 | Role-gated UI | Shared default UI + slots; host injects role-specific additions |
| 15 | i18n catalogs | Keys consolidated in `@ramcar/i18n`; per-app duplicates removed |

All Technical Context unknowns resolved. Proceed to Phase 1.
