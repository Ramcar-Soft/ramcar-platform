---
description: "Task list for Spec 023 — Prominent Success/Error Feedback For Access Log Recording"
---

# Tasks: Prominent Success/Error Feedback For Access Log Recording

**Input**: Design documents from `/specs/023-access-result-feedback/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/access-event-feedback.md ✓, quickstart.md ✓

**Tests**: Tests are EXPLICITLY REQUESTED — the spec defines SC-001..SC-012 as measurable outcomes verified by tests, and `quickstart.md` enumerates the test commands to run. Test tasks are included for each user story and at the foundational primitive level.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Monorepo: pnpm workspaces + Turborepo. Shared primitive lives in `packages/features/src/access-event-feedback/`. i18n strings live in `packages/i18n/src/messages/`. Call sites are in `packages/features/src/visitors/`, `apps/desktop/src/features/`, and `apps/web/src/features/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the file/directory layout and add the i18n strings the rest of the work consumes.

- [X] T001 Create directory tree for the new shared module: `packages/features/src/access-event-feedback/{components,hooks}/` (empty placeholders are fine — implementation files arrive in Phase 2)
- [X] T002 [P] Add `accessEvents.feedback.*` block (9 keys per `contracts/access-event-feedback.md`: `successTitle`, `successDescription`, `successAriaAnnouncement`, `errorTitle`, `errorDescription`, `errorFallbackReason`, `errorAriaAnnouncement`, `retry`, `dismiss`) to `packages/i18n/src/messages/en.json`
- [X] T003 [P] Add the same `accessEvents.feedback.*` block (Spanish translations per `research.md` Decision 7) to `packages/i18n/src/messages/es.json`

**Checkpoint**: Empty module directory exists; i18n catalog has the new strings in EN + ES.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared primitive (types, controller hook, overlay component, public surface) and register it. Every user story depends on these existing.

**⚠️ CRITICAL**: No user story migration can begin until this phase is complete.

- [X] T004 [P] Create `packages/features/src/access-event-feedback/types.ts` with `AccessEventFeedbackPayload`, `AccessEventFeedbackState` (discriminated union: `idle` | `success` | `error`), `AccessEventFeedbackController`, and `AccessEventFeedbackOverlayProps` per `data-model.md`
- [X] T005 Create `packages/features/src/access-event-feedback/hooks/use-access-event-feedback.ts` exporting `useAccessEventFeedback()` per `contracts/access-event-feedback.md` §Hook (state machine, `show(submit, payload)`, `dismiss()`, `retry()`, ~2000 ms auto-dismiss timer on success only, replace-not-stack on new `show()`, timer cleanup on unmount) — depends on T004
- [X] T006 Create `packages/features/src/access-event-feedback/components/access-event-feedback-overlay.tsx` exporting `AccessEventFeedbackOverlay` — composes `Dialog` / `DialogPortal` / `DialogOverlay` / `DialogContent` / `DialogTitle` / `DialogDescription` / `Button` from `@ramcar/ui`; `CheckCircle2` and `AlertTriangle` from `lucide-react`; reads strings via `useI18n()` from `@ramcar/features/adapters`; applies `motion-reduce:` Tailwind modifiers on the `tw-animate-css` zoom/fade classes; success uses `role="status"` (polite) and error uses `role="alert"` (assertive); error variant exposes Retry + Dismiss buttons — depends on T004
- [X] T007 Create `packages/features/src/access-event-feedback/index.ts` exporting `useAccessEventFeedback`, `AccessEventFeedbackOverlay`, and the four type names per `contracts/access-event-feedback.md` §Public exports — depends on T005, T006
- [X] T008 [P] Add `export * from "./access-event-feedback";` to `packages/features/src/index.ts` so `@ramcar/features` re-exports the new module
- [X] T009 [P] Append a new `sharedPrimitives` entry to `shared-features.json` with `name: "access-event-feedback"`, `package: "@ramcar/features/access-event-feedback"`, `addedAt: "2026-04-29"`, and the notes string from `contracts/access-event-feedback.md` §`shared-features.json` contract

**Checkpoint**: Shared primitive is importable from `@ramcar/features`; `pnpm typecheck` passes; `pnpm check:shared-features` recognizes the new entry. User-story migrations can now begin.

---

## Phase 3: User Story 1 — Guard at the booth is unmistakably confirmed (Priority: P1) 🎯 MVP

**Goal**: Replace the corner Sonner success toast at every desktop guard surface (residents, providers, visitors) with the new centered, animated overlay so the guard is unmissably acknowledged when an access event saves. Includes the shared `<VisitorsView />` migration (consumed by the desktop guard journey today) and the `visit-person-access-event-form.tsx` re-throw refactor that makes the page-client the single owner of the success/error overlay.

**Independent Test**: On `apps/desktop`, log in as Guard, open the visitors flow, residents flow, and providers flow in turn; submit one access event from each; observe the centered overlay (with person name + direction + access mode) and confirm the corner Sonner toast for `accessEvents.messages.created` does NOT also fire. The overlay auto-dismisses within ~3 s; reduced-motion mode collapses scale/translate to a fade.

### Tests for User Story 1 ⚠️

> Write before implementation; expect them to fail until T021–T024 land.

- [X] T010 [P] [US1] Hook test — success transitions, auto-dismiss within ≤ 3 s, replace-not-stack, 10× open/close leak stress (no orphan timers via `vi.getTimerCount() === 0`) — covers H-1, H-2, H-4, H-5, H-9 / SC-004, SC-011 — in `packages/features/src/access-event-feedback/hooks/use-access-event-feedback.test.tsx`
- [X] T011 [P] [US1] Component test — success render (icon, title, description with personName/direction/accessMode), `role="status"` polite live region, reduced-motion (computed style is identity transform when `matchMedia('(prefers-reduced-motion: reduce)')` is mocked true), axe-core a11y zero violations on success state, ≥50-char personName wraps without breaking layout, light + dark theme contrast — covers C-1, C-2, C-5, C-6, C-7 / SC-006, SC-007, SC-012 — in `packages/features/src/access-event-feedback/components/access-event-feedback-overlay.test.tsx`
- [ ] T012 [P] [US1] Integration test — desktop visitors flow: after `mutateAsync` resolves, exactly one overlay in the DOM ≤ 200 ms, Sonner container has zero new toasts (SC-001, SC-003) — in `packages/features/src/visitors/__tests__/visitors-view-feedback.test.tsx`
- [ ] T013 [P] [US1] Integration test — desktop residents flow: same overlay-≤-200 ms + Sonner-zero assertions — in `apps/desktop/src/features/residents/components/__tests__/residents-page-client-feedback.test.tsx`
- [ ] T014 [P] [US1] Integration test — desktop providers flow: same overlay-≤-200 ms + Sonner-zero assertions — in `apps/desktop/src/features/providers/components/__tests__/providers-page-client-feedback.test.tsx`

### Implementation for User Story 1

- [X] T015 [P] [US1] Migrate `packages/features/src/visitors/components/visitors-view.tsx` — call `const feedback = useAccessEventFeedback();` once; replace the `toast.success(t("accessEvents.messages.created"))` block at line ~194 with a `feedback.show(thunk, payload)` call (thunk wraps the existing `createAccessEvent.mutateAsync(...)` shape; payload is `{ personName, direction, accessMode }`); render `<AccessEventFeedbackOverlay controller={feedback} />` at the same JSX level as `<VisitPersonSidebar />`; preserve every other Sonner call in the file (visit-person create at line 155, image upload errors at 167, visit-person update at 207, forbidden at 213, error updating at 215)
- [X] T016 [US1] Refactor `packages/features/src/visitors/components/visit-person-access-event-form.tsx` — remove the `toast.error(t("accessEvents.messages.errorCreating"))` line at ~123 inside the catch block; let the rejection propagate (re-throw) so the parent's `feedback.show(...)` thunk receives it and renders the error overlay; keep the `try/catch` so the submit button does not stay in a "submitting" state — depends on T015's contract for the parent-handled error path
- [X] T017 [P] [US1] Migrate `apps/desktop/src/features/residents/components/residents-page-client.tsx` — call `useAccessEventFeedback()`; replace the success toast at line ~96 and the error toast at line ~100 with a single `feedback.show(thunk, payload)` flow; mount `<AccessEventFeedbackOverlay controller={feedback} />`
- [X] T018 [P] [US1] Migrate `apps/desktop/src/features/providers/components/providers-page-client.tsx` — call `useAccessEventFeedback()`; replace the success toast at line ~165 with `feedback.show(thunk, payload)`; mount `<AccessEventFeedbackOverlay controller={feedback} />`; preserve the unrelated provider-domain Sonner calls at lines 127, 143, 178, 182

**Checkpoint**: After this phase, US1 should be fully functional and testable independently — every desktop guard create-access-event surface renders the centered overlay on success and (because the controller hook covers both branches at one writing) on error too. The shared `<VisitorsView />` migration also benefits the web visitors path; that surface's web-host integration test belongs in Phase 4.

---

## Phase 4: User Story 2 — Web admin / resident records an access (Priority: P2)

**Goal**: Extend the same overlay to every `apps/web` access-event-create surface (residents, providers, visitors) so the user-facing experience is identical across personas (Guard, Admin, Resident). Verifies the spec's "global, not only for guard role" constraint and confirms the shared primitive composes across both apps without per-app forking (FR-008 / SC-008).

**Independent Test**: On `apps/web`, log in as Admin and submit an access event from the residents, providers, and visitors pages; sign back in as a Resident and submit on a Resident-allowed surface — each surface renders the centered overlay identical to the desktop journey, with no role gating. `pnpm check:shared-features` passes; CI grep finds no per-app duplicate of the overlay.

### Tests for User Story 2 ⚠️

- [ ] T019 [P] [US2] Integration test — web residents flow success: overlay-≤-200 ms + Sonner-zero — in `apps/web/src/features/residents/components/__tests__/residents-page-client-feedback.test.tsx`
- [ ] T020 [P] [US2] Integration test — web providers flow success: overlay-≤-200 ms + Sonner-zero — in `apps/web/src/features/providers/components/__tests__/providers-page-client-feedback.test.tsx`
- [ ] T021 [P] [US2] Integration test — web visitors flow success (consumes shared `<VisitorsView />`): overlay-≤-200 ms + Sonner-zero (web-host context, `next-intl` adapter wired) — in `apps/web/src/features/visitors/__tests__/visitors-view-feedback-web.test.tsx`
- [ ] T022 [P] [US2] CI guard test — assert no `apps/*/src/features/access-event-feedback/` directory exists and no `apps/*/src/features/**/*centered-overlay*` files exist (SC-008) — in `scripts/check-shared-features.ts` (extend the existing checker) **or** add a new `scripts/check-access-event-feedback-no-duplicate.ts` invoked from the `check:shared-features` pnpm script

### Implementation for User Story 2

- [X] T023 [P] [US2] Migrate `apps/web/src/features/residents/components/residents-page-client.tsx` — call `useAccessEventFeedback()`; replace `toast.success(t("messages.created"))` at line ~105 with `feedback.show(thunk, payload)`; mount `<AccessEventFeedbackOverlay controller={feedback} />`
- [X] T024 [US2] Refactor `apps/web/src/features/residents/components/access-event-form.tsx` — remove the `toast.error(t("messages.errorCreating"))` line at ~131; let the rejection propagate so the page-client's `feedback.show(...)` thunk renders the error overlay; preserve the existing `useFormPersistence` `clearDraft()` call on success — depends on T023's parent-owns-error-overlay contract
- [X] T025 [P] [US2] Migrate `apps/web/src/features/providers/components/providers-page-client.tsx` — call `useAccessEventFeedback()`; replace `toast.success(t("messages.created"))` at line ~174 with `feedback.show(thunk, payload)`; mount `<AccessEventFeedbackOverlay controller={feedback} />`; preserve unrelated provider Sonner calls at lines 130, 146, 187, 191

**Checkpoint**: After this phase, every access-event-create surface in `apps/web` renders the centered overlay identically to desktop. US1 + US2 together complete the success-side experience. `pnpm check:shared-features` continues to pass and the new CI guard confirms no per-app duplicate.

---

## Phase 5: User Story 3 — Failed access-event recording is unmissable too (Priority: P2)

**Goal**: Verify (with tests) and surface (in i18n + form refactors) that every migrated call site renders the centered error overlay on failure with retry support that does not require re-typing form data. The error overlay does NOT auto-dismiss; the original corner error toast for that outcome is suppressed. Code paths for the error branch already exist after Phase 2 (the controller hook handles both branches in one writing), so this phase is dominated by tests and the per-surface error verification.

**Independent Test**: With `apps/api` stopped (or the API mocked to reject), submit an access event from each migrated surface in US1 and US2 — every surface renders the centered error overlay with the error icon, a plain-language reason, and a Retry button. After 10 s the overlay is still on screen (no auto-dismiss). Activating Retry (after restoring the API) re-fires the same payload and resolves into the success overlay without re-typing. The corner Sonner error toast does NOT also fire.

### Tests for User Story 3 ⚠️

- [X] T026 [P] [US3] Hook test — error transitions: `show(...)` rejection enters `error` state with no timer (`vi.getTimerCount() === 0`); after 10 s of fake-timer advancement the overlay is still in DOM (SC-005); `retry()` while in `error` re-invokes the captured submit closure with the original payload (H-7); `dismiss()` while in `error` returns to `idle` with no timer (H-6); new `show(...)` while in `error` replaces the state (no stacking) — extend `packages/features/src/access-event-feedback/hooks/use-access-event-feedback.test.tsx`
- [X] T027 [P] [US3] Component test — error render (`AlertTriangle` icon, `errorTitle`, description from `state.reason` or fallback, Retry button labeled `accessEvents.feedback.retry`, Dismiss button labeled `accessEvents.feedback.dismiss`), `role="alert"` assertive live region, axe-core a11y zero violations on error state, light + dark theme contrast on the error variant — extend `packages/features/src/access-event-feedback/components/access-event-feedback-overlay.test.tsx`
- [ ] T028 [P] [US3] Per-surface error integration tests — for each of the six migrated call sites, mock `mutateAsync` to reject, assert the centered error overlay is in the DOM ≤ 200 ms (SC-002), the Sonner container has zero new toasts (SC-003), the Retry button is wired (clicking it re-fires the mutation with the original payload), and dismissing returns the form to its filled state with data intact — in the existing per-surface `*-feedback.test.tsx` files created in T012, T013, T014, T019, T020, T021 (extend each with `describe("error path")` blocks)

**Checkpoint**: After this phase, US3 is fully verified. Errors at every migrated surface are unmissable, retryable without re-typing, and (per the controller hook design) never auto-dismiss. All form re-throws (T016, T024) pair with their page-client owners so the overlay is the single source of error surfacing.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify cross-cutting success criteria that span the whole feature (i18n single-source, layout-shift = 0, `check:shared-features` passes), then run the manual quickstart smoke and the repo-wide CI gates.

- [ ] T029 [P] Add a CI grep step (or extend an existing `check:i18n` script) asserting that `apps/web/messages/**.json` and `apps/desktop/src/i18n/**.json` (or their equivalents) contain ZERO `accessEvents.feedback.*` keys (SC-010, FR-013) — wire it into the root `package.json` scripts so `pnpm check:shared-features` (or a new `pnpm check:i18n-single-source`) covers it
- [X] T030 [P] Layout-shift assertion — measure `getBoundingClientRect()` of a known surface element in `<VisitorsView />` before opening the overlay and after closing; assert no positional change (SC-009) — add to `packages/features/src/access-event-feedback/components/access-event-feedback-overlay.test.tsx`
- [ ] T031 [P] Light + dark theme contrast verification — extend the existing axe-core test in `access-event-feedback-overlay.test.tsx` with a second pass under the `dark` theme class on `<html>`; assert WCAG AA on icon, title, description, retry button, dismiss button, and scrim in BOTH themes (SC-012, FR-011)
- [ ] T032 Run manual quickstart checks 3.1 → 3.10 from `specs/023-access-result-feedback/quickstart.md` against local `pnpm db:start` + `apps/api` + `apps/web` + `apps/desktop` (success path on every surface, error path with API stopped, replace-not-stack rapid double-submit, ≥50-char visitor name, light + dark themes, `prefers-reduced-motion: reduce`)
- [X] T033 Repo-wide gates — run `pnpm lint`, `pnpm typecheck`, `pnpm test` (root), `pnpm check:shared-features`, and the new i18n single-source grep from T029; all MUST pass before closing the spec

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Story 1 (Phase 3, P1)**: Starts after Phase 2. Independently testable.
- **User Story 2 (Phase 4, P2)**: Starts after Phase 2 — does NOT depend on US1's call-site migrations (its own surfaces are different files), but reuses the same shared primitive built in Phase 2. The shared `<VisitorsView />` migration in T015 (US1) also benefits the web visitors web-host test in T021 (US2) — that test fails until T015 lands.
- **User Story 3 (Phase 5, P2)**: Starts after Phase 2. The error-path tests run against the call sites migrated in US1 and US2; they pass once those call sites are migrated AND the form re-throws (T016, T024) are in place.
- **Polish (Phase 6)**: Depends on US1 + US2 + US3 being complete.

### User Story Dependencies

- **US1 (P1)**: Depends only on Phase 2 (shared primitive). The four call-site migrations (T015, T016, T017, T018) have a single internal ordering: T015 → T016 (T016 hands the error path to the page-client introduced by T015's pattern). T017 and T018 are independent of the visitors files.
- **US2 (P2)**: Depends on Phase 2 and on T015 (only because the web visitors integration test in T021 covers the shared `<VisitorsView />` post-migration). The two web call-site migrations (T023, T025) have a mirrored internal ordering: T023 → T024 (form re-throw). T025 is independent.
- **US3 (P2)**: Depends on Phase 2, on T015–T018 (US1 migrations), and on T023–T025 (US2 migrations). The error tests assert the migrated surfaces handle rejection correctly.

### Within Each User Story

- Tests are written first; they FAIL until the implementation tasks land.
- Within US1: the test set (T010–T014) can be authored in parallel before any implementation; T015 → T016 is sequential; T017 and T018 are independent and can land in any order.
- Within US2: T019–T022 (tests + CI guard) parallel; T023 → T024 sequential; T025 independent.
- Within US3: tests T026, T027, T028 are parallel (different files / different `describe` blocks).

### Parallel Opportunities

- **Phase 1**: T002 + T003 (different JSON files) in parallel.
- **Phase 2**: T004 first (no deps); after it lands, T005 + T006 in parallel; T007 depends on both; T008 + T009 in parallel after T007.
- **Phase 3 (US1)**: T010 + T011 + T012 + T013 + T014 (all different test files) in parallel; T015 + T017 + T018 (different files) in parallel; T016 sequential after T015.
- **Phase 4 (US2)**: T019 + T020 + T021 + T022 in parallel; T023 + T025 in parallel; T024 sequential after T023.
- **Phase 5 (US3)**: T026 + T027 + T028 in parallel.
- **Phase 6**: T029 + T030 + T031 in parallel; T032 + T033 sequential at the end.

---

## Parallel Example: User Story 1

```bash
# Author all five test files for US1 in parallel:
Task: "Hook test in packages/features/src/access-event-feedback/hooks/use-access-event-feedback.test.tsx"
Task: "Component test in packages/features/src/access-event-feedback/components/access-event-feedback-overlay.test.tsx"
Task: "Visitors-view feedback integration test in packages/features/src/visitors/__tests__/visitors-view-feedback.test.tsx"
Task: "Desktop residents feedback integration test in apps/desktop/src/features/residents/components/__tests__/residents-page-client-feedback.test.tsx"
Task: "Desktop providers feedback integration test in apps/desktop/src/features/providers/components/__tests__/providers-page-client-feedback.test.tsx"

# After tests are written and failing, migrate the three independent call sites in parallel:
Task: "Migrate packages/features/src/visitors/components/visitors-view.tsx (T015)"
Task: "Migrate apps/desktop/src/features/residents/components/residents-page-client.tsx (T017)"
Task: "Migrate apps/desktop/src/features/providers/components/providers-page-client.tsx (T018)"

# Then sequentially:
Task: "Refactor packages/features/src/visitors/components/visit-person-access-event-form.tsx (T016)"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1: Setup (directory + i18n keys).
2. Complete Phase 2: Foundational (types + hook + component + exports + registry) — CRITICAL, blocks all stories.
3. Complete Phase 3: User Story 1 — desktop guard surfaces + shared visitors module.
4. **STOP and VALIDATE**: every desktop guard surface renders the centered overlay on success; corner Sonner success toast suppressed; auto-dismiss within 3 s; reduced-motion correct.
5. Demo / merge as the MVP increment.

### Incremental Delivery

- After MVP (US1): demo to product, then layer US2 on top — same shared primitive, three more call sites.
- After US2: layer US3 — error-path tests + form re-throws. Cost is small because the error branch already exists in the hook/component (Phase 2 built both branches together).
- Polish (Phase 6) closes the spec by enforcing the cross-cutting CI gates and running quickstart.

### Parallel Team Strategy

- Developer A: Phase 1 + Phase 2 (foundational primitive + tests authored in US1).
- Once Phase 2 lands:
  - Developer A continues with US1 (desktop migrations).
  - Developer B picks up US2 (web migrations) — independent files.
  - Developer C authors US3 tests (independent test files).
- All three converge in Phase 6 for the polish gates.

---

## Notes

- Tests are explicitly requested per spec SC-001 → SC-012; they are not optional for this feature.
- Each user story is independently demoable and shippable: US1 alone is the MVP; US2 extends to the web; US3 layers in the error-path verification.
- `[P]` tasks operate on different files and have no in-task dependencies. Tasks without `[P]` either share a file with another task or depend on its output.
- `[Story]` label is REQUIRED on every Phase 3+ task and ABSENT on Phase 1, 2, and 6 tasks.
- After every logical group, run `pnpm typecheck` + `pnpm --filter @ramcar/features test access-event-feedback` to keep the feature green during incremental delivery.
- The shared module MUST NOT import `next/*`, `"use client"`, `window.electron`, IPC, or Node-in-renderer APIs — review T005, T006 for compliance against `CLAUDE.md`'s "Cross-App Shared Feature Modules" section.
- Existing keys `accessEvents.messages.created` and `accessEvents.messages.errorCreating` REMAIN in `@ramcar/i18n` (not deleted) — they are simply no longer fired at the migrated call sites (research.md Decision 7).
