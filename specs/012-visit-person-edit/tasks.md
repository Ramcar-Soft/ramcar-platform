---
description: "Task list for 012-visit-person-edit"
---

# Tasks: Edit Visitor/Service Provider Records & Read-Only Access Events

**Input**: Design documents from `/specs/012-visit-person-edit/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/visit-persons.api.md`, `contracts/access-events.api.md`, `quickstart.md`

**Tests**: The feature specification does not mandate new tests. Existing spec 011 tests must continue to pass (SC-004). This task list does not generate new unit/e2e tests; a final polish task runs the existing suites and the `quickstart.md` manual validation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)
- All file paths are absolute-from-repo-root

## Path Conventions

Turborepo monorepo — touched workspaces:

- `apps/web/src/features/{visitors,providers,residents}/`
- `apps/desktop/src/features/{visitors,providers,residents}/` + `apps/desktop/electron/`
- `apps/api/src/modules/access-events/`
- `packages/shared/src/validators/`, `packages/shared/src/index.ts`
- `apps/web/messages/`, `apps/desktop/src/locales/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the branch hygiene checks before touching code.

- [X] T001 Confirm branch `012-visit-person-edit` is checked out and clean; pull latest `main` into branch if needed
- [X] T002 Run baseline `pnpm typecheck` and `pnpm lint` to confirm a green starting state before edits

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Cross-cutting removals and shared-schema changes that every user story depends on. After this phase, the access-event update path no longer exists in shared types and API.

**⚠️ CRITICAL**: No user-story work can begin until this phase is complete — US4 (read-only events) is a precondition for US1/US2/US3/US5 touching the sidebar without re-introducing dead imports.

- [X] T003 Remove `updateAccessEventSchema` and `UpdateAccessEventInput` from `packages/shared/src/validators/access-event.ts`
- [X] T004 Remove re-exports of `updateAccessEventSchema` / `UpdateAccessEventInput` from `packages/shared/src/index.ts`
- [X] T005 Delete the `@Patch(":id") async update(...)` handler and its `updateAccessEventSchema` import from `apps/api/src/modules/access-events/access-events.controller.ts`
- [X] T006 Delete the `update(...)` method from `apps/api/src/modules/access-events/access-events.service.ts`
- [X] T007 Delete the `update(...)` method (if present) from `apps/api/src/modules/access-events/access-events.repository.ts`
- [X] T008 [P] Add the new shared i18n keys `visitPersons.edit.*`, `visitPersons.messages.updated`, `visitPersons.actions.editVisitor`, `visitPersons.actions.editProvider` to `apps/web/messages/en.json` and `apps/web/messages/es.json`; remove `accessEvents.form.edit` and `accessEvents.messages.updated`
- [X] T009 [P] Mirror the same i18n key additions and removals in `apps/desktop/src/locales/en.json` and `apps/desktop/src/locales/es.json`
- [X] T010 Run `pnpm --filter @ramcar/shared build` and `pnpm --filter @ramcar/api build` — both MUST succeed, proving no dangling references to the removed schema on the backend side

**Checkpoint**: Shared schema and API no longer expose access-event update. Frontend still compiles because the `useUpdateAccessEvent` files only import from the now-removed shared schema indirectly — fix in US4.

---

## Phase 3: User Story 4 — Access Events Are Read-Only Everywhere (Priority: P1)

**Goal**: Remove all UI, hooks, and wiring that allow editing a previously created access event on web and desktop, for visitors, providers, and residents. This phase must run **before** US1/US2 because the sidebar changes in US1/US2 build on a cleaned-up sidebar.

**Independent Test**: Open any visitor/provider/resident sidebar and confirm no edit/delete affordance on any past access event; `curl -X PATCH /api/access-events/<uuid>` returns 404; repo-wide grep for `useUpdateAccessEvent`/`updateAccessEventSchema` returns zero matches.

### Implementation for User Story 4

- [X] T011 [P] [US4] Delete file `apps/web/src/features/visitors/hooks/use-update-access-event.ts`
- [X] T012 [P] [US4] Delete file `apps/web/src/features/providers/hooks/use-update-access-event.ts`
- [X] T013 [P] [US4] Delete file `apps/desktop/src/features/visitors/hooks/use-update-access-event.ts`
- [X] T014 [P] [US4] Delete file `apps/desktop/src/features/providers/hooks/use-update-access-event.ts`
- [X] T015 [P] [US4] Remove `onEdit` prop, the edit `<button>`, and the `t("form.edit")` translation call from `apps/web/src/features/visitors/components/recent-events-list.tsx`; component becomes purely display
- [X] T016 [P] [US4] Same cleanup in `apps/web/src/features/providers/components/recent-events-list.tsx`
- [X] T017 [P] [US4] Same cleanup in `apps/desktop/src/features/visitors/components/recent-events-list.tsx`
- [X] T018 [P] [US4] Same cleanup in `apps/desktop/src/features/providers/components/recent-events-list.tsx`
- [X] T019 [US4] In `apps/web/src/features/visitors/components/visit-person-access-event-form.tsx`, remove `editingEvent` and `onCancelEdit` props and all edit-mode branches; form becomes create-only
- [X] T020 [P] [US4] Same cleanup in `apps/web/src/features/providers/components/visit-person-access-event-form.tsx`
- [X] T021 [P] [US4] Same cleanup in `apps/desktop/src/features/visitors/components/visit-person-access-event-form.tsx`
- [X] T022 [P] [US4] Same cleanup in `apps/desktop/src/features/providers/components/visit-person-access-event-form.tsx`
- [X] T023 [US4] In `apps/web/src/features/visitors/components/visit-person-sidebar.tsx`, remove `editingEvent` state, `handleSaveOrUpdate`, the `onUpdateEvent` prop, and stop forwarding `onEdit` to `<RecentEventsList>` and `editingEvent`/`onCancelEdit` to `<VisitPersonAccessEventForm>`. Save handler wires directly to `onSave`.
- [X] T024 [P] [US4] Same cleanup in `apps/web/src/features/providers/components/provider-sidebar.tsx`
- [X] T025 [P] [US4] Same cleanup in `apps/desktop/src/features/visitors/components/visit-person-sidebar.tsx`
- [X] T026 [P] [US4] Same cleanup in `apps/desktop/src/features/providers/components/provider-sidebar.tsx`
- [X] T027 [US4] In `apps/web/src/features/visitors/components/visitors-page-client.tsx`, remove `useUpdateAccessEvent` import, the `updateAccessEvent` hook call, the `handleUpdateEvent` callback, the `onUpdateEvent` prop forwarded to the sidebar, and drop `updateAccessEvent.isPending` from `isSaving`
- [X] T028 [P] [US4] Same cleanup in `apps/web/src/features/providers/components/providers-page-client.tsx`
- [X] T029 [P] [US4] Same cleanup in `apps/desktop/src/features/visitors/components/visitors-page-client.tsx`
- [X] T030 [P] [US4] Same cleanup in `apps/desktop/src/features/providers/components/providers-page-client.tsx`
- [X] T031 [US4] Audit `apps/web/src/features/residents/components/access-event-sidebar.tsx` and `apps/desktop/src/features/residents/components/` to confirm no edit-event affordance exists; if any is found, remove it (spec 011 did not add one, but verify)
- [X] T032 [US4] Run `rg "useUpdateAccessEvent|updateAccessEventSchema|UpdateAccessEventInput" apps packages` — expect **zero** matches. Run `pnpm typecheck` and `pnpm lint` — both MUST pass.

**Checkpoint**: Access events are fully immutable from every client surface. Spec 011 US1–US4 scenarios still work (sidebar still opens on row click, still logs new events).

---

## Phase 4: User Story 1 — Edit an Existing Visitor Record (Priority: P1) 🎯 MVP

**Goal**: Add a trailing actions column with an edit button to the Visitantes table; clicking it opens the sidebar in a new `edit` mode showing a pre-populated person-record form plus the image-management section. Save updates the visit person via `PATCH /api/visit-persons/:id`. No access event is created as a side effect.

**Independent Test**: Create a visitor with a typo, click the edit button in the row, change the name, save. Confirm the toast appears, the table row reflects the new name, and no new `access_events` row is created.

### Implementation for User Story 1

- [X] T033 [P] [US1] Create TanStack mutation hook at `apps/web/src/features/visitors/hooks/use-update-visit-person.ts` calling `PATCH /api/visit-persons/:id` via the shared HTTP client; on success invalidate `["visit-persons", tenantId, ...]` and `["visit-person", tenantId, id]` query keys (tenantId comes from the existing auth context helper used by `useVisitPersons`)
- [X] T034 [P] [US1] Create `apps/web/src/features/visitors/components/visit-person-edit-form.tsx` — a new form component that takes `person: VisitPerson`, pre-populates state from `fullName`, `status`, `residentId`, `notes`, uses `useFormPersistence("visit-person-edit-" + person.id, ...)`, exposes `onSave(patch)` and `onCancel()`, validates via `updateVisitPersonSchema` from `@ramcar/shared`, and shows an `AlertDialog` before discarding dirty state on cancel
- [X] T035 [US1] Add a trailing `actions` column to `apps/web/src/features/visitors/components/visitors-table-columns.tsx` containing an icon `Button` with `aria-label={t("actions.editVisitor")}`. The button calls a new `onEditPerson` callback passed through the columns factory, and its `onClick` calls `e.stopPropagation()` so it does not bubble to the row click handler.
- [X] T036 [US1] Update `apps/web/src/features/visitors/components/visitors-table.tsx` to thread an `onEditPerson` prop from the page client into the columns factory and render the new actions column at the trailing position
- [X] T037 [US1] Extend `apps/web/src/features/visitors/components/visit-person-sidebar.tsx`: widen `mode` prop to `"view" | "create" | "edit"`; when `mode === "edit"`, render `<VisitPersonEditForm>` plus the `<ImageSection>` (no `<VisitPersonAccessEventForm>`, no `<RecentEventsList>`); set sheet title to `t("sidebar.editTitle")`; do not render the vehicle-form branch
- [X] T038 [US1] Update `apps/web/src/features/visitors/components/visitors-page-client.tsx` to: (a) import `useUpdateVisitPerson`; (b) add `handleOpenEdit(person)` that sets `selectedPerson`, `sidebarMode = "edit"`, `sidebarOpen = true` (and ensures keyboard `highlightedIndex` is reset); (c) add `handleSaveEdit(patch)` that calls the mutation, toasts `t("visitPersons.messages.updated")`, and closes the sidebar; (d) pass `onEditPerson={handleOpenEdit}` to `<VisitorsTable>`; (e) pass `onSaveEdit={handleSaveEdit}` and `isSavingEdit={updateVisitPerson.isPending}` to `<VisitPersonSidebar>`
- [X] T039 [US1] Verify keyboard navigation (`useKeyboardNavigation`) still targets the row action — confirm pressing Enter on a highlighted row invokes `handleSelectPerson` (opens `view` mode), NOT `handleOpenEdit`; if the hook currently reads from table state in a way that could collide, add an explicit exclusion
- [ ] T040 [US1] Manual smoke: start `pnpm dev`, log in as a guard, verify §4 of `specs/012-visit-person-edit/quickstart.md` passes end-to-end on web for a visitor

**Checkpoint**: Visitor edit works on web. A misspelled name can be corrected in under 15 seconds with no new access event created (SC-001, SC-003).

---

## Phase 5: User Story 2 — Edit an Existing Service Provider Record (Priority: P1)

**Goal**: Same as US1 but for providers, surfacing `phone` and `company` fields in the edit form.

**Independent Test**: Click the edit button in a provider row, change the company, save, confirm the table row and no new access event.

### Implementation for User Story 2

- [X] T041 [P] [US2] Create TanStack mutation hook at `apps/web/src/features/providers/hooks/use-update-visit-person.ts` mirroring T033, with providers query-key invalidations
- [X] T042 [P] [US2] Create `apps/web/src/features/providers/components/provider-edit-form.tsx` with the same structure as the visitors edit form PLUS `phone` and `company` `<Input>` fields and `residentId` treated as optional
- [X] T043 [US2] Add the trailing actions column to `apps/web/src/features/providers/components/providers-table-columns.tsx` with an edit icon button, `aria-label={t("actions.editProvider")}`, stopping click propagation
- [X] T044 [US2] Update `apps/web/src/features/providers/components/providers-table.tsx` to thread `onEditPerson` and render the trailing actions column
- [X] T045 [US2] Extend `apps/web/src/features/providers/components/provider-sidebar.tsx` with `mode: "view" | "create" | "edit"`, rendering `<ProviderEditForm>` + `<ImageSection>` when `mode === "edit"`
- [X] T046 [US2] Update `apps/web/src/features/providers/components/providers-page-client.tsx` with `handleOpenEdit`, `handleSaveEdit`, mutation wiring, and prop forwarding (mirrors T038)
- [ ] T047 [US2] Manual smoke: run `pnpm dev` and verify §5 of `quickstart.md` passes for a provider

**Checkpoint**: Provider edit works on web.

---

## Phase 6: User Story 3 — Preserve Current New-Visit Workflow (Priority: P1)

**Goal**: Confirm (and adjust if needed) that row-click, Register-New, and keyboard navigation all continue to behave exactly as spec 011 defined, despite the new actions column and edit mode. This phase is mostly verification with any needed fixes.

**Independent Test**: On both Visitantes and Proveedores pages, click a row body → sidebar opens in `view` mode and logs a new event exactly as before; click `Register New` → sidebar opens in `create` mode; press `B → ArrowDown → Enter` → sidebar opens in `view` mode on the highlighted row.

### Implementation for User Story 3

- [X] T048 [US3] In `apps/web/src/features/visitors/components/visitors-table.tsx`, verify the row click handler (`onSelectPerson`) is attached to the `<tr>` and that the edit `<Button>` in the actions column has `type="button"` and uses `e.stopPropagation()`; if the row handler fires on `onClick`, ensure the edit cell wrapper is a non-interactive `<td>` so bubbling is the only escape path
- [X] T049 [P] [US3] Repeat T048 audit in `apps/web/src/features/providers/components/providers-table.tsx`
- [ ] T050 [US3] Run spec 011 acceptance scenarios for US1–US4 (by clicking rows and logging events) against the running `pnpm dev` web app. Confirm all existing behaviors pass unchanged (SC-004).
- [X] T051 [US3] Confirm the `use-keyboard-navigation` hook's selection path still calls `handleSelectPerson` (view mode), not the edit handler; pressing Enter must NOT open edit mode

**Checkpoint**: New-visit workflow fully preserved on web.

---

## Phase 7: Desktop Parity — US1 + US2 + US3 (Priority: P1 for desktop)

**Goal**: Mirror web changes to the Electron app so the feature works identically on desktop, including offline edit via the outbox pattern. This phase is a single block because the desktop renderer changes are symmetric with web and the main-process changes are a small additive set.

**Independent Test**: Run the desktop app, repeat §4–§6 and §9 of `quickstart.md` (including the offline scenario).

### Desktop renderer (React)

- [X] T052 [P] [US1] Create `apps/desktop/src/features/visitors/hooks/use-update-visit-person.ts` — mirrors web T033 but calls the preload-bridged `window.api.visitPersons.update(id, patch)` instead of `fetch` (falls back to outbox when offline via the existing IPC wrapper)
- [X] T053 [P] [US2] Create `apps/desktop/src/features/providers/hooks/use-update-visit-person.ts` analogous to T052
- [X] T054 [P] [US1] Create `apps/desktop/src/features/visitors/components/visit-person-edit-form.tsx` (react-i18next instead of next-intl, otherwise identical to T034)
- [X] T055 [P] [US2] Create `apps/desktop/src/features/providers/components/provider-edit-form.tsx` analogous to T054
- [X] T056 [US1] Add trailing actions column in `apps/desktop/src/features/visitors/components/visitors-table-columns.tsx` and thread `onEditPerson` in `visitors-table.tsx`
- [X] T057 [US2] Add trailing actions column in `apps/desktop/src/features/providers/components/providers-table-columns.tsx` and thread `onEditPerson` in `providers-table.tsx`
- [X] T058 [US1] Extend `apps/desktop/src/features/visitors/components/visit-person-sidebar.tsx` with `mode: "view" | "create" | "edit"` as in web T037
- [X] T059 [US2] Extend `apps/desktop/src/features/providers/components/provider-sidebar.tsx` as in web T045
- [X] T060 [US1] Wire edit handlers in `apps/desktop/src/features/visitors/components/visitors-page-client.tsx` as in web T038
- [X] T061 [US2] Wire edit handlers in `apps/desktop/src/features/providers/components/providers-page-client.tsx` as in web T046
- [X] T062 [US3] Audit desktop keyboard navigation in `apps/desktop/src/features/{visitors,providers}/hooks/use-keyboard-navigation.ts` to confirm Enter still opens `view` mode, not edit mode

### Desktop main process (Node) — offline edit path

- [X] T063 [US1] In `apps/desktop/electron/ipc/visit-persons.ipc.ts` (or equivalent), add an `updateVisitPerson` IPC handler that delegates to the main-process service
- [X] T064 [US1] In `apps/desktop/electron/services/visit-persons.service.ts` (or equivalent), add an `update(personId, patch)` method that: (a) writes optimistically to the SQLite cache; (b) tries the API call — if online, returns the server result; (c) if offline, enqueues an outbox entry with op kind `"visit_person.update"` and payload `{ personId, patch, eventId: crypto.randomUUID() }`
- [X] T065 [US1] In `apps/desktop/electron/services/sync-engine.ts`, add a handler for outbox op kind `"visit_person.update"` that replays the patch against `PATCH /api/visit-persons/:personId` with `X-Event-Id: <eventId>` (or whatever idempotency header the existing engine uses)
- [X] T066 [US1] Expose `visitPersons.update(id, patch)` through `apps/desktop/electron/preload.ts` (context bridge) and declare the matching TypeScript signature in the shared preload types file that the renderer imports
- [ ] T067 [US1] Manual smoke: execute §9 of `quickstart.md` (desktop + offline edit round-trip)

**Checkpoint**: Feature works identically on desktop, including offline edit. SC-005 (opening time) and SC-006 (offline reliability) verified.

---

## Phase 8: User Story 5 — Image Management from the Edit Sidebar (Priority: P2)

**Goal**: Ensure the image section is rendered inside the new `edit` mode so that uploading, replacing, and viewing images is available without switching to the new-visit sidebar.

**Independent Test**: Open the edit sidebar for a visitor/provider, upload a new face image, close and reopen — image persists.

### Implementation for User Story 5

- [X] T068 [US5] In `apps/web/src/features/visitors/components/visit-person-sidebar.tsx` `edit` branch, include `<ImageSection>` wired to the existing `useVisitPersonImages` query and `useUploadVisitPersonImage` mutation (same hooks used in `view` mode)
- [X] T069 [P] [US5] Same in `apps/web/src/features/providers/components/provider-sidebar.tsx`
- [ ] T070 [P] [US5] Same in `apps/desktop/src/features/visitors/components/visit-person-sidebar.tsx`
- [ ] T071 [P] [US5] Same in `apps/desktop/src/features/providers/components/provider-sidebar.tsx`
- [X] T072 [US5] Confirm the image upload path fires independently of the person-form save (image upload has its own mutation; closing the edit sheet with a dirty text form AFTER a successful image upload must warn about text changes only, not roll back the image)
- [ ] T073 [US5] Manual smoke: §8 of `quickstart.md`

**Checkpoint**: Image management works from the edit sidebar on both platforms.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Verify the integrated feature end-to-end and catch any leftover dead code, translations, or regressions.

- [X] T074 Run `pnpm typecheck` across the monorepo — MUST pass
- [X] T075 Run `pnpm lint` across the monorepo — MUST pass
- [X] T076 Run `pnpm test` — all existing unit tests MUST pass (no new tests added by this feature)
- [ ] T077 Run `pnpm --filter @ramcar/web test:e2e` (Playwright) — spec 011 e2e scenarios MUST pass unchanged (SC-004)
- [X] T078 Repo-wide grep `rg "useUpdateAccessEvent|updateAccessEventSchema|UpdateAccessEventInput|editingEvent|onUpdateEvent|accessEvents\.form\.edit" apps packages` — must return zero matches outside `specs/`
- [X] T079 [P] Review `apps/web/messages/{en,es}.json` and `apps/desktop/src/locales/{en,es}.json` for orphaned keys related to the removed "edit event" flow; remove any stragglers
- [ ] T080 Execute the full `specs/012-visit-person-edit/quickstart.md` walkthrough end-to-end on web, then on desktop (online + offline scenarios)
- [ ] T081 Update `MEMORY.md` only if new stable project context emerged (usually none); otherwise skip
- [X] T082 Run `pnpm --filter @ramcar/api build` and `pnpm --filter @ramcar/web build` and `pnpm --filter desktop build` — all MUST pass

**Checkpoint**: Feature is ready for code review / PR.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies.
- **Phase 2 (Foundational)**: Depends on Phase 1. Removes shared schema and API update route. Blocks all user stories because any UI file that currently imports `useUpdateAccessEvent` would otherwise break on shared type resolution.
- **Phase 3 (US4 read-only cleanup)**: Depends on Phase 2. Must run before Phases 4–7 because those phases reshape the same sidebar files and would otherwise conflict with US4's cleanup diffs.
- **Phase 4 (US1 web)**: Depends on Phase 3. Can start in parallel with Phase 5 (US2) — different files.
- **Phase 5 (US2 web)**: Depends on Phase 3. Parallel with Phase 4.
- **Phase 6 (US3 verification)**: Depends on Phases 4 and 5 — verifies their integration preserved the old row-click behavior.
- **Phase 7 (Desktop parity)**: Depends on Phase 3 at minimum; in practice run after Phase 6 to mirror already-stabilized web diffs. Internally parallelizable along the same lines as web.
- **Phase 8 (US5 images)**: Depends on Phases 4, 5, 7 (needs the `edit` mode rendered on both platforms).
- **Phase 9 (Polish)**: Depends on all prior phases.

### Parallel Opportunities

- Within **Phase 2**, T008 and T009 are `[P]` — web and desktop i18n files are independent.
- Within **Phase 3 (US4)**, T011–T018 and T020–T022 and T024–T026 and T028–T030 are all `[P]` — each pair/set touches a different file.
- **Phase 4 (US1 web)** and **Phase 5 (US2 web)** can be parallelized by two developers: visitors files vs. providers files.
- Within **Phase 7 (Desktop)**, all `[P]` tasks (T052–T055, T056/T057 pairs) are independent. The main-process chain T063→T064→T065→T066 is sequential.
- Within **Phase 8 (US5)**, T069–T071 are all `[P]`.
- Within **Phase 9**, T079 is `[P]` relative to the test/build tasks.

---

## Parallel Example: Phase 3 (US4 hook and component deletions)

```bash
# Four hook-file deletions can happen simultaneously:
Task: "Delete apps/web/src/features/visitors/hooks/use-update-access-event.ts"      # T011
Task: "Delete apps/web/src/features/providers/hooks/use-update-access-event.ts"      # T012
Task: "Delete apps/desktop/src/features/visitors/hooks/use-update-access-event.ts"   # T013
Task: "Delete apps/desktop/src/features/providers/hooks/use-update-access-event.ts"  # T014

# Four recent-events-list cleanups, one file each, in parallel:
Task: "Strip onEdit from apps/web/src/features/visitors/components/recent-events-list.tsx"      # T015
Task: "Strip onEdit from apps/web/src/features/providers/components/recent-events-list.tsx"     # T016
Task: "Strip onEdit from apps/desktop/src/features/visitors/components/recent-events-list.tsx"  # T017
Task: "Strip onEdit from apps/desktop/src/features/providers/components/recent-events-list.tsx" # T018
```

---

## Implementation Strategy

### MVP First (Web + Read-Only Events)

1. Phase 1 (Setup)
2. Phase 2 (Foundational cleanup)
3. Phase 3 (US4: Access events read-only — cleanup)
4. Phase 4 (US1: Edit visitor on web)
5. **STOP and validate**: §4 of `quickstart.md` passes, no regressions in spec 011 web flow.
6. Ship the web MVP — it already delivers SC-001, SC-002, SC-003, SC-004 for web visitors.

### Incremental Delivery

1. Add Phase 5 (US2 providers web) → demo.
2. Add Phase 6 (US3 verification) → continuous-integration safety net.
3. Add Phase 7 (Desktop parity) → deploy to booth.
4. Add Phase 8 (US5 images) → polish.
5. Phase 9 (final validation) → PR.

### Parallel Team Strategy

After Phase 3 completes:

- **Dev A**: Phase 4 (US1 web) → Phase 8 (US5 web bits)
- **Dev B**: Phase 5 (US2 web) → Phase 8 (US5 web bits)
- **Dev C**: Phase 7 (Desktop renderer) then sync-engine tasks → Phase 8 (US5 desktop bits)
- Dev A or B runs Phase 6 verification after both US1 and US2 land.
- Any dev runs Phase 9 once all feature phases are merged.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps each task to the spec.md user story.
- Phase 2 and Phase 3 intentionally ship first because the read-only-events rule is the ground truth that the edit feature depends on; reshaping the sidebar while leaving half of the old edit affordance would be the most error-prone sequencing.
- No new unit/e2e tests are added by this task list. The feature's verification relies on (a) spec 011 tests continuing to pass, (b) the `quickstart.md` manual walkthrough, and (c) the repo-wide grep checks that assert removals are complete.
- Commit after each phase checkpoint.
- Do not push or open a PR until the user explicitly requests it (see `MEMORY.md` / `feedback_no_auto_commit.md`).
