---

description: "Task list for feature 015-users-form-sidebar — migrate users catalog create/edit forms to right-side Sheet"
---

# Tasks: Users Catalog — Migrate New/Edit Forms to Right-Side Sheet

**Input**: Design documents from `/specs/015-users-form-sidebar/`
**Prerequisites**: `plan.md` ✅, `spec.md` ✅, `research.md` ✅, `data-model.md` ✅, `contracts/users.api.md` ✅, `quickstart.md` ✅

**Tests**: Included. The spec (FR-018) explicitly requires the existing test suite to keep passing after targeted updates, and `research.md` §R-008 prescribes a new `user-sidebar.test.tsx` file plus an edit of `users-table-interaction.test.tsx`. Test tasks are therefore in-scope for this feature.

**Organization**: Grouped by user story so each priority can be implemented, tested, and reviewed independently. US1 and US2 share the new `UserSidebar` component — US1 builds the chassis + create-mode branch; US2 extends it with edit-mode branches.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- All paths below are **absolute from repo root** unless prefixed with `/` (routing segments).

## Path Conventions

- **Web app (this feature's only app)**: `apps/web/src/...`
- **Shared i18n package**: `packages/i18n/src/messages/...`
- No backend, desktop, or shared-features package changes.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the branch is clean and the existing users-module suite passes before refactoring.

- [X] T001 Verify current branch `015-users-form-sidebar` builds green by running `pnpm --filter @ramcar/web typecheck`, `pnpm --filter @ramcar/web lint`, and `pnpm --filter @ramcar/web test --run apps/web/src/features/users` from the repo root; abort if any fail (baseline per `quickstart.md §0`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the shared i18n keys that both US1 (create-mode title) and US2 (edit-mode title) depend on. Must complete before Phase 3.

**⚠️ CRITICAL**: No user-story work can reference `users.sidebar.*` keys until these files are updated.

- [X] T002 Add `"sidebar": { "createTitle": "Create User", "editTitle": "Edit User" }` under the existing `"users"` block in `packages/i18n/src/messages/en.json` (per `research.md §R-007` and `quickstart.md §5`).
- [X] T003 [P] Mirror the same keys with Spanish strings (`"Crear Usuario"`, `"Editar Usuario"`) under `"users"` in `packages/i18n/src/messages/es.json`.
- [X] T004 [P] If `packages/i18n/src/messages/en.ts` and `es.ts` re-export the JSON with `as const` typing or explicit type shape, mirror the new `sidebar.createTitle` / `sidebar.editTitle` entries there; otherwise skip (inspect the file first — do not invent entries that are not required by the type system).
- [X] T005 Run `pnpm --filter @ramcar/i18n typecheck` (or `pnpm -w typecheck` if the package has no direct script) to confirm the i18n additions compile.

**Checkpoint**: `users.sidebar.createTitle` and `users.sidebar.editTitle` are resolvable from both web (`next-intl`) and the existing type-safe imports. User-story phases can now begin.

---

## Phase 3: User Story 1 — Create a new user from the catalog without leaving the list (Priority: P1) 🎯 MVP

**Goal**: Clicking "Create User" on `/catalogs/users` opens a right-side Sheet containing the existing `UserForm` in create mode; submit writes via `POST /api/users`, closes the Sheet, toasts success, and refreshes the table — without any URL change.

**Independent Test**: On `/<locale>/catalogs/users`, click "Create User" → confirm a right-side Sheet opens with title `users.sidebar.createTitle` and the URL is unchanged. Fill required fields, press "Create" → the Sheet closes, a success toast (`users.messages.created`) appears, and the new row is visible in the table.

### Tests for User Story 1 ⚠️

> Write before implementation where practical. Keep assertions behavior-based, not structural.

- [X] T00X [P] [US1] Create `apps/web/src/features/users/__tests__/user-sidebar.test.tsx` with two initial cases for create mode: (a) `open=false` renders nothing (`queryByRole("dialog")` is null); (b) `open=true, mode="create"` renders a dialog with the translated `users.sidebar.createTitle` in the header, renders `UserForm` in create mode, does NOT call `useGetUser`, and does NOT render a loading spinner. Use the existing `renderWithProviders` helper pattern from the users `__tests__` folder for `QueryClient` + `next-intl` wiring; stub `useCreateUser`, `useTenants`, `useUserGroups` as needed so the test is hermetic.

### Implementation for User Story 1

- [X] T00X [US1] Create `apps/web/src/features/users/components/user-sidebar.tsx`. It is a client component (`"use client";`). Public prop contract matches `data-model.md §2.2` exactly: `{ open: boolean; mode: "create" | "edit"; userId?: string; onClose: () => void }`. Layout: `<Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>` → `<SheetContent side="right" className="w-[400px] sm:w-[800px] sm:max-w-[800px] overflow-y-auto px-4 pb-6">` → `<SheetHeader><SheetTitle>{t(mode === "create" ? "users.sidebar.createTitle" : "users.sidebar.editTitle")}</SheetTitle><SheetDescription className="sr-only">…</SheetDescription></SheetHeader>` → a mode-switch body. For this task only implement the `mode === "create"` branch: call `useTenants()`, `useUserGroups()`, and `useCreateUser()`, then render `<UserForm mode="create" tenants={…} userGroups={…} isPending={createMutation.isPending} onSubmit={(values) => createMutation.mutate(values, { onSuccess: onClose })} onCancel={onClose} />`. Reference the structure of `packages/features/src/visitors/components/visit-person-sidebar.tsx` (width classes, header shape, import style) but keep this file inside the users feature as a new local component. Do NOT import anything from `packages/features/*` — the users module is web-only per `CLAUDE.md`. Do NOT change `UserForm`'s public props.
- [X] T00X [US1] Update `apps/web/src/features/users/components/users-table.tsx`: (a) remove the `useRouter` import and all `router.push` calls (the `Create User` button's `onClick` must no longer route); (b) add three pieces of local state via `useState`: `sidebarOpen: boolean` (default false), `sidebarMode: "create" | "edit"` (default `"create"`), `selectedUserId: string | undefined` (default undefined); (c) rewire the "Create User" button's `onClick` to `() => { setSelectedUserId(undefined); setSidebarMode("create"); setSidebarOpen(true); }` (preserve the existing role-gate conditional `user?.role === "super_admin" || user?.role === "admin"` — FR-015); (d) render `<UserSidebar open={sidebarOpen} mode={sidebarMode} userId={selectedUserId} onClose={() => setSidebarOpen(false)} />` at the end of the component's JSX; (e) if `locale` was only used to build the old `/${locale}/catalogs/users/…` push targets, remove it from this component's prop list (and from the call site in `apps/web/src/app/[locale]/(dashboard)/catalogs/users/page.tsx` if it becomes unused) — do NOT leave a dead prop.
- [X] T00X [US1] Extend `apps/web/src/features/users/__tests__/user-sidebar.test.tsx` (added in T006) with a create-submit case: on `open=true, mode="create"`, simulate a valid form submission and assert (a) the mocked `useCreateUser` mutate is called with the form payload and (b) `onClose` is invoked exactly once on mutation success. Keep the test hermetic — do not hit a real API.
- [X] T0XX [US1] Run `pnpm --filter @ramcar/web test --run user-sidebar` and `pnpm --filter @ramcar/web test --run users-table` to confirm the new test file passes and nothing in the users folder regressed; fix any drift before proceeding to US2.

**Checkpoint**: US1 is fully functional — create flow goes through the Sheet end-to-end with zero URL navigation (SC-002 partially satisfied for the create path). Row-click edit still uses the legacy `router.push` at this point; that is intentionally US2's job.

---

## Phase 4: User Story 2 — Edit an existing user from the catalog without leaving the list (Priority: P1)

**Goal**: Clicking an editable row (or the row-actions "Edit" menu item) opens the same right-side Sheet, pre-populated with that user's data; submit writes via `PUT /api/users/:id`, closes the Sheet, toasts success, and refreshes the row — without any URL change.

**Independent Test**: On `/<locale>/catalogs/users`, click a row where `canEdit === true` → the Sheet opens in edit mode with title `users.sidebar.editTitle`. While the user is loading, the Sheet body shows a spinner; when loaded, the form is populated with the user's current values. Change a field and press "Save" → the Sheet closes, a success toast (`users.messages.updated`) appears, and the row's values update in place.

### Tests for User Story 2 ⚠️

- [X] T0XX [P] [US2] Extend `apps/web/src/features/users/__tests__/user-sidebar.test.tsx` with three edit-mode cases (per `data-model.md §2.4`): (a) `open=true, mode="edit", userId="u1"` while `useGetUser` is pending → renders a spinner, does NOT render `UserForm`, does NOT call `useUpdateUser`'s mutate; (b) same but `useGetUser` errored → renders the error banner using the `users.errorLoading` translation key, does NOT render `UserForm`; (c) same but data present → renders `UserForm` with `mode="edit"` and `initialData` equal to the fetched user. Also assert that mounting with `open=false, mode="edit", userId="u1"` does NOT fire `useGetUser` (the `enabled` gate stays off).
- [X] T0XX [P] [US2] Update `apps/web/src/features/users/__tests__/users-table-interaction.test.tsx`: remove the two `expect(mockRouterPush).toHaveBeenCalledWith("/en/catalogs/users/p1/edit")` assertions (one for the row click, one for the row-action Edit menu) and the `mockRouterPush` wiring. Replace each with a Sheet-open assertion — query for `role="dialog"` and confirm the header text resolves to `users.sidebar.editTitle` (the test harness's `useTranslations` stub returns the key verbatim, so `getByText("users.sidebar.editTitle")` is sufficient). Keep all other assertions in that file unchanged. Verify the file's imports are minimal (no unused `useRouter`/`mockRouterPush`).

### Implementation for User Story 2

- [X] T0XX [US2] Extend `apps/web/src/features/users/components/user-sidebar.tsx` to add the three edit-mode branches. Inside the component: call `useGetUser(userId ?? "", { enabled: Boolean(open && mode === "edit" && userId) })` (or the equivalent signature the hook accepts today — inspect `use-get-user.ts` before wiring) and `useUpdateUser(userId ?? "")`. Body render logic: if `mode === "edit" && (isLoading || isFetching)` → render a centered spinner (reuse `Loader2` from `lucide-react` like the other modules do); else if `mode === "edit" && isError` → render the existing error-banner styling with `t("users.errorLoading")`; else if `mode === "edit" && data` → render `<UserForm mode="edit" initialData={data} tenants={…} userGroups={…} isPending={updateMutation.isPending} onSubmit={(values) => updateMutation.mutate(values, { onSuccess: onClose })} onCancel={onClose} />`. Do NOT introduce a `view` mode. Preserve invariants I-1..I-4 from `data-model.md §2.3`.
- [X] T0XX [US2] Update `apps/web/src/features/users/components/users-table.tsx`: rewrite the `handleEdit` row-action callback (previously `router.push(\`/${locale}/catalogs/users/${u.id}/edit\`)`) to `(u) => { setSelectedUserId(u.id); setSidebarMode("edit"); setSidebarOpen(true); }`. Apply the same rewrite to the row's `onClick` handler that gates on `row.canEdit === true` (FR-016 — preserve the non-editable-row fallthrough). Do NOT alter any other row-level behavior (status toggle, delete, etc. stay as-is).
- [X] T0XX [US2] Extend the sidebar test file with an edit-submit case: `open=true, mode="edit", userId="u1"` and data present, simulate a valid submit → assert `useUpdateUser` mutate is called with the form payload and that `onClose` is invoked on mutation success.
- [X] T0XX [US2] Run `pnpm --filter @ramcar/web test --run users` from the repo root and confirm `user-sidebar.test.tsx`, `users-table-interaction.test.tsx`, and all other users-module tests pass. Also spot-check that `user-form-role-lock.test.tsx`, `user-form-user-group.test.tsx`, `users-table-columns.test.tsx`, `user-status-badge.test.tsx`, and `hooks.test.ts` required zero edits (per `research.md §R-008`).

**Checkpoint**: US2 is fully functional. Both primary write paths (create + edit) flow through the single `UserSidebar` instance; the users catalog now emits zero `router.push` calls for those flows (SC-002 fully satisfied for its scope). Legacy `/new` and `/[id]/edit` routes are still reachable directly — US3 removes them.

---

## Phase 5: User Story 3 — Legacy `/new` and `/[id]/edit` URLs no longer exist (Priority: P2)

**Goal**: Delete the page-based route files and their client wrappers so the Sheet is the *only* surface for creating and editing users. Direct navigation to the legacy URLs returns Next.js's default 404 (no redirect shim — `research.md §R-005`).

**Independent Test**: `grep -r "catalogs/users/new" apps/web/src` and `grep -rE "catalogs/users/\\[id\\]/edit" apps/web/src` each return zero matches. Manually visiting `/<locale>/catalogs/users/new` or `/<locale>/catalogs/users/<some-id>/edit` in the running app renders Next.js's not-found response.

### Implementation for User Story 3

- [X] T0XX [P] [US3] Delete `apps/web/src/app/[locale]/(dashboard)/catalogs/users/new/page.tsx`.
- [X] T0XX [P] [US3] Delete `apps/web/src/app/[locale]/(dashboard)/catalogs/users/[id]/edit/page.tsx`.
- [X] T0XX [P] [US3] Delete `apps/web/src/features/users/components/create-user-page-client.tsx`.
- [X] T0XX [P] [US3] Delete `apps/web/src/features/users/components/edit-user-page-client.tsx`.
- [X] T0XX [US3] Remove empty parent directories after the deletions: `rmdir apps/web/src/app/[locale]/(dashboard)/catalogs/users/new`, `rmdir apps/web/src/app/[locale]/(dashboard)/catalogs/users/[id]/edit`, and finally `rmdir apps/web/src/app/[locale]/(dashboard)/catalogs/users/[id]` (each must actually be empty — abort if another file still lives there).
- [X] T0XX [US3] Grep the `apps/web/src` tree for residual references and fail-closed on any match. Minimum set: `grep -r "catalogs/users/new" apps/web/src`, `grep -rE "catalogs/users/\\[id\\]/edit" apps/web/src`, `grep -rE "(Create|Edit)UserPageClient" apps/web/src`. All three must return zero matches (SC-001 verifier). If any reference remains (e.g., a stale import, a test fixture, a navigation helper), update or delete it in this task.
- [X] T0XX [US3] Run `pnpm --filter @ramcar/web typecheck` and `pnpm --filter @ramcar/web test --run` to confirm the deletions did not break any import graph or test fixture; fix any residual compile errors here before proceeding.

**Checkpoint**: The users feature has a single code path for create and edit. SC-001, SC-002, and partially SC-005 are satisfied.

---

## Phase 6: User Story 4 — Keyboard-driven catalog users can still create and edit via the Sheet (Priority: P3)

**Goal**: Preserve the keyboard-navigation unification introduced in commit `865f121`: pressing Enter on an editable highlighted row opens the Sheet in edit mode, and while the Sheet is open the shared `useKeyboardNavigation` hook is disabled so arrow keys do not move the table selection while the form has focus (same pattern as `VisitorsView` and `ResidentsPageClient`).

**Independent Test**: Focus the users search input, press ArrowDown to highlight a row, press Enter → the Sheet opens in edit mode for that user. With the Sheet open, press ArrowDown repeatedly → the highlighted row does not change. Press Esc → the Sheet closes; press ArrowDown → row navigation resumes.

### Implementation for User Story 4

- [X] T0XX [US4] In `apps/web/src/features/users/components/users-table.tsx`, locate the existing `useKeyboardNavigation({...})` call and pass `disabled: sidebarOpen` in its options object (the same `sidebarOpen` state added in T008). Match the call-site shape used by `packages/features/src/visitors/components/visitors-view.tsx` or `apps/web/src/features/residents/.../residents-page-client.tsx` — whichever is closer to the current users-table layout — so the pattern stays uniform. Do not add any new imports beyond what is already in the file.
- [X] T0XX [US4] Add a keyboard-interaction test case (either a new block inside `apps/web/src/features/users/__tests__/users-table-interaction.test.tsx` or a new file if the existing one is already crowded): after opening the Sheet in edit mode, simulate ArrowDown on the table and assert the highlighted row index does not change. Keep the test deterministic (use `user-event` with `keyboard("{ArrowDown}")` and spy on whatever callback `useKeyboardNavigation` uses to move the highlight). If mocking the shared hook is cleaner than driving it for real, mock it and assert it was called with `disabled: true` while the Sheet is open.
- [X] T0XX [US4] Run `pnpm --filter @ramcar/web test --run users-table-interaction` and `pnpm --filter @ramcar/web test --run user-sidebar`; confirm both pass.

**Checkpoint**: All four user stories are functional and independently verifiable. The feature matches the Visitors / Providers / Residents keyboard pattern.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification gates from the spec's Success Criteria (SC-001..SC-007) and the `quickstart.md §6` manual checklist.

- [X] T0XX Run `pnpm --filter @ramcar/web typecheck` from the repo root; must exit 0 (strict mode — SC-007 dependency).
- [X] T0XX [P] Run `pnpm --filter @ramcar/web lint` from the repo root; must exit 0.
- [X] T0XX [P] Run `pnpm --filter @ramcar/web test --run` (full web suite, not just users) from the repo root; must exit 0. This catches any ripple effects from the `users-table.tsx` prop-shape change or the deleted components.
- [X] T0XX [P] Run `grep -rE "supabase\\.(from|rpc|storage)" apps/web/src` from the repo root; must return zero matches (Constitution VIII / SC-006 verifier — confirms no new direct-DB calls were introduced by the refactor).
- [X] T0XX [P] Run `grep -r "@ramcar/features" apps/web/src/features/users/` from the repo root; must return zero matches (SC-007 verifier — users stays a web-only local feature, no shared-features promotion).
- [X] T0XX Manual QA walkthrough per `quickstart.md §6` checklist against a local dev server (`pnpm --filter @ramcar/web dev`): (a) Create via Sheet with no URL change, toast + row appear; (b) Edit via Sheet with no URL change, toast + row update; (c) Esc preserves draft in `localStorage` under `ramcar-draft:user-create` / `ramcar-draft:user-edit-<id>`; (d) Form's Cancel button clears the draft; (e) `/en/catalogs/users/new` and `/en/catalogs/users/<id>/edit` render 404; (f) With `resident` role the Create button is hidden and rows are not editable (FR-015, FR-016 regression guard); (g) Sheet slides in from the right and fades out on close (SC-005 — animation parity with Visitors/Providers). If any checklist item fails, file a follow-up task before marking this phase complete.
- [X] T0XX Mark the spec's Success Criteria table confirmed in the PR description: SC-001 (grep zero), SC-002 (no router.push on create/edit), SC-003 (sheet-open p95 under 500 ms — eyeball is acceptable for an internal app), SC-004 (users suite green), SC-005 (visual parity), SC-006 (no new `supabase.from/rpc/storage`), SC-007 (no `@ramcar/features` import from users).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — baseline verification.
- **Phase 2 (Foundational)**: Depends on Phase 1. Blocks all user-story phases because both US1 and US2 render `users.sidebar.*` titles.
- **Phase 3 (US1)**: Depends on Phase 2.
- **Phase 4 (US2)**: Depends on Phase 3 because US2 extends the `UserSidebar` component built in US1 and reuses the sidebar state added to `UsersTable` in US1. (Could be parallelized by two developers if they coordinate the `user-sidebar.tsx` merge point, but this plan keeps them sequential for a single-implementer flow.)
- **Phase 5 (US3)**: Depends on Phase 4 — do not delete the legacy routes until both create and edit flows work through the Sheet, otherwise mid-flight commits leave the app unable to create/edit users.
- **Phase 6 (US4)**: Depends on Phase 3 (needs `sidebarOpen` state to exist). Technically independent from Phase 4/5 but lumped here in priority order.
- **Phase 7 (Polish)**: Depends on Phases 1–6.

### User-Story Dependencies

- **US1 (P1)** — no cross-story dependencies beyond the Foundational i18n keys.
- **US2 (P1)** — consumes the `UserSidebar` component and `UsersTable` sidebar state authored in US1; cannot start until T007 + T008 land.
- **US3 (P2)** — consumes fully-working create AND edit Sheet flows (US1 + US2). Deleting `/new/page.tsx` before US1 lands would break the current create flow on trunk.
- **US4 (P3)** — consumes `sidebarOpen` state from US1 (T008) to gate `useKeyboardNavigation`. Independent of US3.

### File-Level Coordination (same-file conflicts)

- `apps/web/src/features/users/components/user-sidebar.tsx` — created in T007, extended in T013. Sequential.
- `apps/web/src/features/users/__tests__/user-sidebar.test.tsx` — created in T006, extended in T009, T011, T015. Sequential.
- `apps/web/src/features/users/components/users-table.tsx` — edited in T008, T014, T024. Sequential.
- `apps/web/src/features/users/__tests__/users-table-interaction.test.tsx` — edited in T012 and potentially T025. Sequential if T025 writes to the same file; otherwise [P].

### Parallel Opportunities

- T003, T004 (different i18n files; T002 must land first only if T003/T004 branch off its JSON structure, but they're different files so they are `[P]` in practice).
- T017, T018, T019, T020 — four independent file deletions, all `[P]`.
- T028, T029, T030, T031 — polish-phase verification commands touching no files, all `[P]`.

---

## Parallel Example: Phase 5 (US3 route deletions)

```bash
# These four deletions have no ordering requirement — run them together:
rm apps/web/src/app/[locale]/(dashboard)/catalogs/users/new/page.tsx
rm apps/web/src/app/[locale]/(dashboard)/catalogs/users/[id]/edit/page.tsx
rm apps/web/src/features/users/components/create-user-page-client.tsx
rm apps/web/src/features/users/components/edit-user-page-client.tsx
# T021 (rmdir of the empty parents) runs after the four above complete.
# T022 grep-verify runs last in this phase.
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Phase 1 (Setup) — sanity checks.
2. Phase 2 (Foundational) — i18n keys.
3. Phase 3 (US1 Create) — Sheet + Create button wired.
4. **STOP and VALIDATE**: admins can create users through the Sheet on `/catalogs/users`; edit still uses the old route (acceptable intermediate state for MVP demo).
5. Ship-gate if the reviewer wants just the create half; otherwise continue.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 (Create via Sheet) → demoable (MVP).
3. US2 (Edit via Sheet) → primary write paths unified.
4. US3 (Route cleanup) → single code path, 404s for legacy URLs.
5. US4 (Keyboard parity) → regression guard for spec 014 unification.
6. Polish → SC verifiers + manual QA.

### Single-Developer Strategy (expected)

This feature is sized for one developer, 1–2 hours of focused time (per `quickstart.md` estimate). Sequential order through Phase 1 → 7 is the recommended path. The `[P]` markers above matter mainly within Phase 5 (four file deletions) and Phase 7 (verification commands); everything else is single-threaded by design.

---

## Notes

- `[P]` tasks = different files, no dependencies on incomplete tasks.
- `[Story]` label maps task → user story for traceability.
- Every user story above is independently testable per its "Independent Test" paragraph.
- The feature introduces **zero** new dependencies, API endpoints, DB migrations, or `@ramcar/features` promotions. `research.md §10` is the authoritative list of "NOT changed by this feature" guarantees.
- Do not commit or push — wait for the user's explicit instruction per repo convention.
