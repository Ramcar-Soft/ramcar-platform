# Quickstart — Prominent Success/Error Feedback For Access Log Recording

**Spec**: [./spec.md](./spec.md) | **Plan**: [./plan.md](./plan.md) | **Research**: [./research.md](./research.md) | **Data Model**: [./data-model.md](./data-model.md) | **Contract**: [./contracts/access-event-feedback.md](./contracts/access-event-feedback.md) | **Date**: 2026-04-29

This quickstart shows how an implementer (or reviewer) verifies the feature end-to-end on a clean workspace. It assumes node 22, pnpm, and a working local Supabase stack (`pnpm db:start`).

---

## 1. One-time setup

```bash
nvm use                  # node 22 LTS
pnpm install
pnpm db:start
pnpm db:reset            # apply migrations + seed
pnpm db:types            # regenerate @ramcar/db-types
```

No new migration is introduced by this feature — `pnpm db:reset` is the same baseline as `main`.

---

## 2. Run the apps

```bash
# Terminal A — NestJS API
pnpm --filter @ramcar/api dev

# Terminal B — Next.js portal
pnpm --filter @ramcar/web dev

# Terminal C — Electron guard booth
pnpm --filter @ramcar/desktop dev
```

---

## 3. Verify the migrated call sites

For each surface, perform the success path and the error path. The success path needs no extra setup. The error path requires the API to reject — easiest is to stop `apps/api`, attempt the create, then restart and use the in-overlay **Retry**.

### 3.1 Desktop guard — visitors flow (US1)

1. Sign in as a Guard.
2. Open the visitors page (`<VisitorsView />`).
3. Select an existing visitor (or create one).
4. Tap **Save** with `direction = entry`, `accessMode = vehicle`, a vehicle selected.
5. **Expected (success)**:
   - Centered card animates in (scale + fade) with the success icon, the title from `accessEvents.feedback.successTitle`, and a description containing the visitor name + entry + vehicle.
   - The corner Sonner toast for `accessEvents.messages.created` does NOT appear.
   - The card auto-dismisses within ≤ 3 s (or earlier on Esc / backdrop click / dismiss control).
   - The visit-person sidebar is closed/reset; the recent-events list reflects the new event after the card dismisses.
6. **Expected (error — stop the API first)**:
   - Centered error card animates in with the error icon, the title from `accessEvents.feedback.errorTitle`, a plain-language reason, a **Retry** button, and a **Dismiss** button.
   - The card does NOT auto-dismiss after 10 s.
   - Clicking **Retry** (after restarting the API) resolves into the success card without re-typing form data.
7. **Reduced motion**: enable "Reduce motion" in macOS / Windows / Linux a11y settings, repeat step 4. The card still appears centered, but with no scale/translate animation — only an instant fade.

### 3.2 Desktop guard — residents flow (US1)

1. Same as 3.1 but on the residents page (`<ResidentsPageClient />` desktop).
2. Form: select resident, `direction`, `accessMode`, optional vehicle / notes.
3. **Expected**: same success and error behavior as 3.1.

### 3.3 Desktop guard — providers flow (US1)

1. Same as 3.1 but on the providers page.
2. **Expected**: same success and error behavior. (Note: the previous desktop providers code only had a success toast — this feature adds the error overlay too via the controller hook.)

### 3.4 Web admin — residents flow (US2)

1. Sign in as an Admin on `apps/web`.
2. Open the residents page.
3. Submit an access event.
4. **Expected (success)**: centered card with the same visual language as desktop, identifying the resident name + direction + accessMode.
5. **Expected (error)**: centered error card with retry. Web's `useFormPersistence` keeps the form data in `localStorage`; verify retry without re-typing.

### 3.5 Web admin — providers flow (US2)

1. Same as 3.4 but on the providers page.
2. **Expected**: same as 3.4.

### 3.6 Web admin — visitors flow (US2)

1. Same as 3.4 but on the visitors page (`<VisitorsView />` from `@ramcar/features` consumed by the web host).
2. **Expected**: same as 3.4.

### 3.7 Web Resident user (US2)

1. Sign in as a Resident on `apps/web`.
2. On a Resident-allowed surface that creates an access event, submit.
3. **Expected**: identical centered card. There is NO role gating on the overlay (FR-007).

### 3.8 Replace, not stack (US1 acceptance #3)

1. On any surface, open the form.
2. Submit twice in rapid succession (e.g., second submit while the first card is still on screen).
3. **Expected**: at most one card on screen at any time. The new outcome replaces the prior; nothing stacks.

### 3.9 Long visitor name (FR-015)

1. Create a visit person with a 50+ character name (e.g., "Maximiliano Hernández Sebastián de la Fuente y Ramírez Castro").
2. Submit an access event for them.
3. **Expected**: the description wraps inside the card; the dismiss control remains visible and clickable.

### 3.10 Light + dark themes (FR-011, SC-012)

1. Toggle the theme on each app.
2. Trigger success and error cards.
3. **Expected**: icon, text, scrim, retry/dismiss buttons all pass WCAG AA contrast in both themes.

---

## 4. Verify the spec's success criteria mechanically

```bash
# Run the unit + integration tests for the new module and migrated call sites
pnpm --filter @ramcar/features test access-event-feedback
pnpm --filter @ramcar/web test access-event
pnpm --filter @ramcar/desktop test access-event

# Cross-app sharing audit (must pass — FR-008, SC-008)
pnpm check:shared-features

# i18n single-source audit (must pass — FR-013, SC-010)
# Implementation will add a CI step roughly equivalent to:
! grep -r "accessEvents\.feedback" apps/web/messages apps/desktop/src/i18n 2>/dev/null

# Lint + typecheck across the repo
pnpm lint
pnpm typecheck
```

The test files (per `research.md` Decision 8) cover: success render, error render, auto-dismiss-success, no-auto-dismiss-error, replace-not-stack, reduced-motion, axe-core a11y + contrast, and 10× open/close stress for SC-011.

---

## 5. Review checklist (gate the PR)

A reviewer accepts this feature when ALL of the below hold:

- [ ] **Single shared module**: `packages/features/src/access-event-feedback/` exists with `types.ts`, `hooks/use-access-event-feedback.ts`, `components/access-event-feedback-overlay.tsx`, `components/access-event-feedback-overlay.test.tsx`, `index.ts`.
- [ ] **No per-app duplicate**: `apps/web/src/features/` and `apps/desktop/src/features/` contain NO `access-event-feedback` directory or equivalent overlay component.
- [ ] **`shared-features.json`** has a new entry under `sharedPrimitives` with `name: "access-event-feedback"`, `package: "@ramcar/features/access-event-feedback"`, `addedAt: "2026-04-29"`.
- [ ] **i18n keys** added to `packages/i18n/src/messages/en.json` and `es.json` under `accessEvents.feedback.*` exactly per `contracts/access-event-feedback.md`. **No** matching keys appear in any per-app message file.
- [ ] **All 7 call sites migrated** per `research.md` Decision 6 — exactly the listed `toast.success` / `toast.error` lines removed; all other Sonner calls preserved.
- [ ] **No `next/*`, no `"use client"`, no `window.electron` / IPC / Node imports** inside `packages/features/src/access-event-feedback/`.
- [ ] **Zero unjustified `any`** in the new code (TS strict mode).
- [ ] **`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm check:shared-features`** all pass on the branch.
- [ ] **Manual checks 3.1–3.10** all pass on local desktop and local web.

If any item fails, the PR is rejected.

---

## 6. Fast smoke (≤ 60 seconds — sanity)

For a quick gut-check after a code change:

```bash
pnpm --filter @ramcar/features test access-event-feedback
```

Then in the running web dev server, click into the residents page, submit an access event, and confirm the centered card appears. If both pass, the surface contract is intact.
