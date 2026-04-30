# Tasks: Inline Vehicle Edit and Delete in Person Sidebars

**Input**: Design documents from `/specs/026-inline-vehicle-edit/`
**Prerequisites**: plan.md (✓), spec.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓), quickstart.md (✓)

**Tests**: Test tasks ARE included for this feature. Vitest coverage for shared and per-app sidebars is required by the plan; Jest coverage extension for the API rule change (FR-012) is required by the API contract; SC-006 forbids regressions in the existing residents access-event-sidebar suite.

**Organization**: Tasks are grouped by user story (US1–US4) so each story can be implemented and tested independently after the Foundational phase lands.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete-task dependencies inside the same phase).
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4). Setup, Foundational, and Polish tasks have no story label.
- Each task description ends with the exact file path it edits or creates.

## Path Conventions

This is a Turborepo + pnpm monorepo. Touched paths:

- `packages/features/src/shared/vehicle-form/` — shared component (foundational)
- `packages/features/src/visitors/` — bi-app visit-person sidebar + access-event picker
- `apps/web/src/features/{users,providers,residents}/` — web host-app sidebars + resident picker
- `apps/desktop/src/features/{providers,residents}/` — desktop host-app sidebars + resident picker
- `apps/api/src/modules/vehicles/` — API service (single rule tightening)

Zero new packages, zero new dependencies, zero schema changes, zero new endpoints, zero new DTOs, zero new i18n keys, zero new desktop outbox kinds.

---

## Phase 1: Setup

**Purpose**: Confirm working tree and toolchain are ready. No new packages, no new configuration, no migrations introduced by this feature.

- [X] T001 Confirm `pnpm install` succeeds, current branch is `026-inline-vehicle-edit`, and the baseline `pnpm typecheck`, `pnpm lint`, and `pnpm test` all pass on `main` plus the empty branch before any change in this spec is started

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Generalize the shared `VehicleManageList` component and update both existing call sites in lockstep — required before any user story can mount the component for a new owner kind. The discriminated-union `owner` prop is a TypeScript-level breaking change, so the existing residents access-event-sidebar call sites (web + desktop) MUST be updated atomically with the component change or the workspace typecheck fails.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. SC-006 (existing residents access-event-sidebar surface continues to render and behave identically) is the safety net for this phase.

- [X] T002 Generalize `VehicleManageList` prop shape: replace `residentId: string` with discriminated `owner: VehicleOwner` (where `VehicleOwner = { kind: "resident"; userId: string } | { kind: "visitPerson"; visitPersonId: string }`); add optional `canDelete?: boolean` (default `true`); derive cache key from `owner.kind` (`["vehicles", tenantId, "resident", owner.userId]` or `["vehicles", tenantId, "visit-person", owner.visitPersonId]`); gate the trash icon and the delete confirmation `AlertDialog` on `canDelete`; preserve the existing toast taxonomy (`vehicles.messages.deleted` / `vehicles.messages.forbidden` / `vehicles.messages.errorDeleting`); preserve the empty-state, loading-state, and `onEdit` / `onClose` behavior verbatim — in `packages/features/src/shared/vehicle-form/vehicle-manage-list.tsx`
- [X] T003 [P] Rename the `residentId={resident.id}` prop on the `<VehicleManageList>` call site to `owner={{ kind: "resident", userId: resident.id }}`; do not introduce `canDelete` (the parent already gates `view === "manage"` on `canManageVehicles`, so default `true` preserves current semantics) — in `apps/web/src/features/residents/components/access-event-sidebar.tsx`
- [X] T004 [P] Symmetric rename: `residentId={resident.id}` → `owner={{ kind: "resident", userId: resident.id }}` on the `<VehicleManageList>` call site, no `canDelete` change — in `apps/desktop/src/features/residents/components/access-event-sidebar.tsx`
- [X] T005 [P] Extend the `VehicleManageList` Vitest suite: keep the existing resident-owner happy path, pencil → `onEdit`, trash → confirm → `DELETE /vehicles/:id`, and 403 → `vehicles.messages.forbidden` toast tests; add (a) renders for `owner: { kind: "visitPerson", visitPersonId: "vp-1" }` and the delete invalidates the `["vehicles", tenantId, "visit-person", "vp-1"]` cache key, (b) `canDelete={false}` removes the trash icon from the DOM while leaving the pencil intact, (c) `canDelete={false}` with `vehicles=[]` still renders the empty-state message — in `packages/features/src/shared/vehicle-form/vehicle-manage-list.test.tsx`

**Checkpoint**: Foundation ready. The shared component now accepts both owner kinds with role-gated delete; the existing residents access-event-sidebar surface (web + desktop) continues to behave identically (SC-006).

---

## Phase 3: User Story 1 - Guard fixes a typo on a vehicle right after creating it (Priority: P1) 🎯 MVP

**Goal**: A guard at the booth registers a visitor (or service provider) inline with a vehicle (per spec 025), notices a typo on the access-event step, opens the inline manage list, edits the vehicle, and returns to the access-event step with the corrected label — without leaving the sidebar.

**Independent Test**: Sign in as a guard. (a) Register a visitor with an inline vehicle and an intentional plate typo. (b) On the access-event step, open the manage list, click pencil on the just-created vehicle, change the plate, save. (c) Verify the picker shows the corrected plate, the access-event step is still ready to save, and no second vehicle was created.

### Implementation for User Story 1

- [X] T006 [US1] Extend the cross-app visit-person sidebar with the `default | manage | edit-vehicle | create-vehicle` view-state machine (mirroring the pattern in `apps/web/src/features/residents/components/access-event-sidebar.tsx`): fold the existing `showVehicleForm` boolean into the union (`true` → `"create-vehicle"`); add `editingVehicle: Vehicle | null` companion state; reset `view`/`editingVehicle` via `useEffect` when `person?.id` changes; expose a "manage vehicles" entry-point inside the access-event step in view mode; in the `manage` view render `<VehicleManageList owner={{ kind: "visitPerson", visitPersonId: person.id }} canDelete={canDelete} … />` where `canDelete = role === "Admin" || role === "SuperAdmin"`; in the `edit-vehicle` view render `<VehicleForm mode="edit" vehicle={editingVehicle} … />` and route save/cancel back to `manage`; preserve the existing `create-vehicle` flow from spec 025 unchanged — in `packages/features/src/visitors/components/visit-person-sidebar.tsx`
- [X] T007 [US1] Symmetric web provider sidebar: introduce the same `default | manage | edit-vehicle | create-vehicle` view-state machine, same `canDelete` computation, same `<VehicleManageList owner={{ kind: "visitPerson", visitPersonId: person.id }} … />` and `<VehicleForm mode="edit" />` wiring, same `useEffect` reset on `person?.id` change, same "manage vehicles" entry-point inside the access-event step in view mode — in `apps/web/src/features/providers/components/provider-sidebar.tsx`
- [X] T008 [US1] Symmetric desktop provider sidebar with the same view-state machine and `<VehicleManageList>` wiring as T007 — in `apps/desktop/src/features/providers/components/provider-sidebar.tsx`
- [X] T009 [P] [US1] Add Vitest coverage for the visit-person sidebar manage flow: open in view mode → access-event step renders → "manage vehicles" affordance present → click → manage list shows the just-created vehicle → click pencil → `<VehicleForm mode="edit">` is mounted pre-populated → save → returns to manage list with refreshed label → back arrow → access-event step shows the corrected label and the same vehicle is still selected (no second vehicle created); guard role assertion: pencil is rendered, trash icon is NOT rendered (`canDelete={false}`); admin role assertion: both icons rendered — in `packages/features/src/visitors/__tests__/visit-person-sidebar-manage.test.tsx`
- [X] T010 [P] [US1] Add Vitest coverage for the web provider sidebar manage flow with the same shape and assertions as T009 — in `apps/web/src/features/providers/__tests__/provider-sidebar-manage.test.tsx`

**Checkpoint**: At this point, US1 is fully functional and independently testable. Guards can edit visit-person and provider vehicles inline post-creation on web and desktop. **MVP is reachable here** — could ship as an early increment without US2/US3/US4 (US2's API hardening is recommended for the same release for a coherent guarantee, but US1 alone delivers the SC-001 / SC-002 outcome).

---

## Phase 4: User Story 2 - Guards cannot delete vehicles, even visitor or provider ones (Priority: P1)

**Goal**: Vehicle deletion is reserved for admin and super-admin, regardless of whether the vehicle is owned by a resident or a visit-person. The constraint is enforced at the UI layer (delete affordance never rendered to guards — wired via `canDelete={false}` in T006-T008) and at the API layer (any guard `DELETE /api/vehicles/:id` returns 403 — wired via the FR-012 service rule tightening in this phase). Defense in depth at both layers.

**Independent Test**: (UI) On every sidebar a guard reaches that mounts `VehicleManageList` (visit-person + provider — covered by T009/T010 assertions), the trash icon is never rendered. (API) Direct `DELETE /api/vehicles/:id` as a guard returns 403, regardless of whether the vehicle is owned by a resident or a visit-person — verified by the spec extension in T012.

### Implementation for User Story 2

- [X] T011 [US2] Tighten `VehiclesService.remove` per FR-012: drop the `(existing as { user_id: string | null }).user_id !== null` qualifier on the role check; the condition becomes `if (role === "guard") throw new ForbiddenException("Guards cannot delete vehicles")`; preserve the existing `findById` 404 path and the `softDelete` count-of-0 race-conflict path; preserve the same `ForbiddenException` class and HTTP status (403); update the exception message string to reflect the broader rule — in `apps/api/src/modules/vehicles/vehicles.service.ts`
- [X] T012 [US2] Extend the `VehiclesService.remove` Jest spec block: keep the existing "throws NotFoundException when the vehicle is missing", "forbids guards deleting resident vehicles", "admin delete soft-deletes via the repository", and "treats softDelete count of 0 as NotFound (concurrent delete)" tests unchanged; add (a) "forbids guards deleting visit-person-owned vehicles" — `findById` returns a row with `user_id: null, visit_person_id: "vp-1"`, calling `service.remove(..., adminScope, "guard")` rejects with `ForbiddenException` and `repository.softDelete` is NOT invoked; (b) "admin can delete a visit-person-owned vehicle" — regression coverage that the rule narrows only for guards (`findById` returns a row with `visit_person_id: "vp-1"`, `softDelete` returns 1, `service.remove` resolves and `softDelete` is invoked with the vehicle id and tenant) — in `apps/api/src/modules/vehicles/__tests__/vehicles.service.spec.ts`

**Checkpoint**: At this point, US2 is fully enforced at the API. The UI half of US2 is exercised by T009/T010's `canDelete={false}` assertions on visit-person and provider sidebars and by T014's user-sidebar assertions in US3.

---

## Phase 5: User Story 3 - Admin manages resident vehicles inline in the user catalog edit sidebar (Priority: P2)

**Goal**: An admin or super-admin opens an existing resident from the Users catalog and sees their vehicles directly in the edit sidebar. The admin can edit a vehicle (e.g., new plate after a renewal) or delete a vehicle the resident no longer owns — all without leaving the sidebar. The vehicle list section is hidden when the user being edited is not a resident, and is hidden for guards as defense in depth (FR-008).

**Independent Test**: Sign in as an admin on the web. (a) Open the Users catalog and click a resident row → user edit sidebar opens with a Vehicle section listing the resident's vehicles; each row exposes pencil and trash icons. (b) Click pencil → vehicle edit form opens pre-populated; save → vehicle updated, list refreshed, resident profile fields unchanged (SC-004). (c) Click trash → confirmation dialog → confirm → vehicle removed from list; resident profile unchanged. (d) Open a non-resident user → vehicle section is not rendered (FR-003). (e) Open the same sidebar as a guard (defense-in-depth — guards do not normally reach this surface) → vehicle section is not rendered (FR-008).

### Implementation for User Story 3

- [X] T013 [US3] Extend the user-sidebar with an embedded vehicle manage section gated to `mode === "edit" && userData?.role === "resident" && (role === "Admin" || role === "SuperAdmin")`: introduce an `EditModeSubView = "default" | "edit-vehicle"` sub-state and an `editingVehicle: Vehicle | null` companion state; in the `default` sub-state render `<UserForm mode="edit" />` followed (always co-rendered, not replacing) by `<VehicleManageList owner={{ kind: "resident", userId: userData.id }} canDelete={true} onEdit={...} onClose={...} />`; in the `edit-vehicle` sub-state replace BOTH the user form and the manage list with `<VehicleForm mode="edit" vehicle={editingVehicle} />`; on save/cancel of the vehicle form, return to `"default"`; fetch resident vehicles via `useResidentVehicles(userData.id)` (or the equivalent shared hook the package exposes) gated on `Boolean(open && mode === "edit" && userData?.role === "resident")`; reset `subView`/`editingVehicle` when the sidebar's user identity changes; do NOT mount the section for non-resident users or for guards — in `apps/web/src/features/users/components/user-sidebar.tsx`
- [X] T014 [P] [US3] Add Vitest coverage for the user-sidebar manage flow: admin opens a resident → vehicle list visible with pencil + trash; admin opens a non-resident user (admin/guard/super_admin) → no vehicle section (FR-003); guard reaches the sidebar (forced by test setup) → no vehicle section (FR-008); pencil → `<VehicleForm mode="edit">` mounted pre-populated and the user form + manage list are unmounted; save → returns to default sub-state with refreshed list; trash → confirmation dialog → confirm → row disappears; explicit assertion that `<UserForm>` field values are not mutated by either vehicle operation (SC-004) — in `apps/web/src/features/users/__tests__/user-sidebar-manage.test.tsx`

**Checkpoint**: At this point, US3 is independently functional. Admins and super-admins can manage resident vehicles inline from the Users catalog edit sidebar.

---

## Phase 6: User Story 4 - Admin manages visitor/provider vehicles inline in the visit-person edit sidebar (Priority: P2)

**Goal**: An admin or super-admin opens an existing visitor or service provider from their respective catalog. They see the visit-person's vehicles directly in the edit sidebar (alongside the visit-person edit form) and can edit or delete them inline. The picker on any visible access-event surface refreshes when a vehicle changes; if the picker had a deleted vehicle selected, the selection becomes empty (D5 in research.md, EC-2 in quickstart.md).

**Independent Test**: Sign in as an admin. (a) Open Visitors (or Service Providers), click a row → sidebar opens; switch to edit mode → visit-person edit form is shown alongside a Vehicle section with pencil and trash icons per row. (b) Click pencil on a vehicle, edit, save → vehicle updates, visit-person record fields unchanged (SC-004). (c) Click trash, confirm → vehicle disappears from list and from any access-event picker on the same surface; if the picker had selected the deleted vehicle, its selection becomes empty.

### Implementation for User Story 4

- [X] T015 [US4] In the visit-person sidebar's **edit mode** (the existing branch that currently renders `<VisitPersonEditForm />`), embed `<VehicleManageList owner={{ kind: "visitPerson", visitPersonId: person.id }} canDelete={canDelete} … />` beneath the edit form as an always-visible section (mirroring T013's user-sidebar layout pattern); reuse the `editingVehicle` state and the `edit-vehicle` view introduced in T006 — the `manage` block in edit mode is co-rendered (not a sub-view), but pencil → `edit-vehicle` still replaces the entire body with `<VehicleForm mode="edit">`; preserve T006's view-mode behavior unchanged — in `packages/features/src/visitors/components/visit-person-sidebar.tsx`
- [X] T016 [US4] Mirror the edit-mode embedded vehicle manage section on web provider sidebar with the same wiring as T015 (reusing T007's view-state machine) — in `apps/web/src/features/providers/components/provider-sidebar.tsx`
- [X] T017 [US4] Mirror the edit-mode embedded vehicle manage section on desktop provider sidebar with the same wiring as T015 (reusing T008's view-state machine) — in `apps/desktop/src/features/providers/components/provider-sidebar.tsx`
- [X] T018 [US4] Add a stale-selection cleanup `useEffect` to the visit-person access-event picker so a stale selection becomes empty when its vehicle disappears from the cache: `useEffect(() => { if (selectedVehicleId && vehicles && !vehicles.some(v => v.id === selectedVehicleId)) setSelectedVehicleId(""); }, [vehicles, selectedVehicleId]);` — in `packages/features/src/visitors/components/visit-person-access-event-form.tsx`
- [X] T019 [P] [US4] Add the same stale-selection cleanup `useEffect` (per D5, identical shape as T018) to the residents access-event picker on web — in `apps/web/src/features/residents/components/access-event-form.tsx`
- [X] T020 [P] [US4] Add the same stale-selection cleanup `useEffect` (per D5, identical shape as T018) to the residents access-event picker on desktop — in `apps/desktop/src/features/residents/components/access-event-form.tsx`

**Checkpoint**: At this point, US4 is independently functional. Admins can manage visitor and provider vehicles inline in edit mode (web + desktop), and stale picker selections are automatically cleared on every access-event picker (visit-person + residents on both web and desktop).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all stories. No new implementation expected; this phase is verification.

- [X] T021 Run `pnpm typecheck` from the repo root — confirm zero TypeScript errors after the discriminated-union prop change cascades to all six call sites (the two existing residents access-event-sidebar files updated in T003/T004 + the four new sidebars edited in T006/T007/T008/T013); the discriminated union forces narrowing at every call site, so a missed update surfaces as a build error
- [X] T022 Run `pnpm lint` from the repo root — confirm zero new lint warnings or errors
- [X] T023 Run `pnpm test` from the repo root — confirm the Vitest suites for `vehicle-manage-list`, `visit-person-sidebar-manage`, `provider-sidebar-manage`, and `user-sidebar-manage` all pass; confirm the Jest spec for `vehicles.service` (with the FR-012 changes from T011/T012) passes; SC-006 regression check: confirm the existing residents access-event-sidebar Vitest suite (`apps/web/src/features/residents/__tests__/`) continues to pass without modification beyond the prop rename in T003
- [ ] T024 Execute the manual smoke test in `specs/026-inline-vehicle-edit/quickstart.md`: US1 on web AND desktop (guard fix-typo flow on visitor and provider), US2 via direct `DELETE /api/vehicles/:id` cURL as guard against both a resident vehicle (expect 403, unchanged) and a visit-person vehicle (expect 403, was 204 before — FR-012 verification), US3 on web (admin user catalog → resident edit sidebar → edit + delete), US4 on web AND desktop (admin visit-person + provider edit modes), plus the four edge-case verifications (EC-1 concurrent edit conflict, EC-2 stale picker selection, EC-3 empty list, EC-4 desktop offline)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion. **BLOCKS all user stories.** The discriminated-union prop is a breaking type change — the two existing residents access-event-sidebar call sites (web + desktop) MUST be updated in lockstep with the component edit, or the workspace typecheck fails.
- **User Story 1 (Phase 3, P1)**: Depends on Foundational completion. Independent of US2/US3/US4 once Foundational is done.
- **User Story 2 (Phase 4, P1)**: Depends on Foundational completion. The API change is technically independent of the component change, but is grouped after Foundational for cohesion. Independent of US1/US3/US4.
- **User Story 3 (Phase 5, P2)**: Depends on Foundational completion. Independent of US1/US2/US4 (different file).
- **User Story 4 (Phase 6, P2)**: Depends on Foundational completion. T015 modifies the same file as T006 — T015 must run **after** T006 (the edit-mode embedded section reuses the view-state machine introduced in T006). T016 depends on T007; T017 depends on T008. T018/T019/T020 (picker cleanups) are independent of every sidebar task and depend only on Foundational.
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### User Story Dependencies

- **US1 → US2**: US2 strengthens the API guard rule for deletion. US1's UI gating already passes `canDelete={false}` for guards via T006/T007/T008, so US1 visually meets US2's UI side; US2 closes the API-layer gap. The two stories are independently shippable but US2 SHOULD ship in the same release for a coherent guarantee.
- **US3 → others**: independent. T013 (`user-sidebar.tsx`) and T014 (its test) touch files no other story touches.
- **US4 → US1**: T015/T016/T017 reuse the view-state machine introduced by T006/T007/T008 in the same files (sequencing within the file), but the user-story behaviors are independent — US1 ships view-mode manage, US4 ships edit-mode manage. T018/T019/T020 are independent of every other task in the feature.

### Within Each User Story

- **US1**: T006 is the cross-app hub change (visitors). T007 / T008 (provider sidebars) are symmetric and can be parallelized after T006 lands. T009 / T010 (tests) are parallelizable with each other and with T007 / T008 (different files).
- **US2**: T011 (service) → T012 (spec). The spec asserts on the new behavior, so T011 must land first.
- **US3**: T013 (sidebar) → T014 (tests).
- **US4**: T015 / T016 / T017 each touch a different file → parallelizable, but each individually depends on the matching T006 / T007 / T008 having landed. T018 / T019 / T020 each touch a different file → fully parallelizable with each other and with T015 / T016 / T017.

### Parallel Opportunities

- **Foundational (Phase 2)**: After T002 lands, T003 + T004 + T005 run in parallel.
- **US1**: After T006 lands, T007 + T008 + T009 + T010 run in parallel (four different files).
- **US2**: T011 → T012 (sequential within US2). US2 as a whole runs in parallel with US1, US3, US4 once Foundational is done.
- **US3**: T013 → T014.
- **US4**: T015 / T016 / T017 (each file is different — parallelizable, gated on the matching T006-T008 landing). T018 / T019 / T020 (each file is different — parallelizable, gated only on Foundational).
- **Cross-story**: After Foundational, US1, US2, US3, US4 can be developed in parallel by separate developers.

---

## Parallel Example: User Story 1

```bash
# After T006 (cross-app visit-person-sidebar) lands, parallelize the symmetric provider-sidebar edits + tests:

Task: "T007 [US1] Extend provider-sidebar.tsx (web) with the same view-state machine in apps/web/src/features/providers/components/provider-sidebar.tsx"
Task: "T008 [US1] Extend provider-sidebar.tsx (desktop) with the same view-state machine in apps/desktop/src/features/providers/components/provider-sidebar.tsx"
Task: "T009 [US1] Add Vitest coverage for the visit-person sidebar manage flow in packages/features/src/visitors/__tests__/visit-person-sidebar-manage.test.tsx"
Task: "T010 [US1] Add Vitest coverage for the provider sidebar manage flow in apps/web/src/features/providers/__tests__/provider-sidebar-manage.test.tsx"
```

## Parallel Example: User Story 4

```bash
# After T006/T007/T008 land (US1 view-state machines), parallelize the edit-mode embeds and the picker cleanups:

Task: "T015 [US4] Embed manage section in visit-person-sidebar edit mode at packages/features/src/visitors/components/visit-person-sidebar.tsx"
Task: "T016 [US4] Embed manage section in web provider-sidebar edit mode at apps/web/src/features/providers/components/provider-sidebar.tsx"
Task: "T017 [US4] Embed manage section in desktop provider-sidebar edit mode at apps/desktop/src/features/providers/components/provider-sidebar.tsx"
Task: "T018 [US4] Picker stale-selection cleanup in packages/features/src/visitors/components/visit-person-access-event-form.tsx"
Task: "T019 [US4] Picker stale-selection cleanup in apps/web/src/features/residents/components/access-event-form.tsx"
Task: "T020 [US4] Picker stale-selection cleanup in apps/desktop/src/features/residents/components/access-event-form.tsx"
```

## Parallel Example: Foundational Phase

```bash
# After T002 (component generalization) lands, parallelize the two call-site renames and the test extension:

Task: "T003 Rename residentId → owner at apps/web/src/features/residents/components/access-event-sidebar.tsx"
Task: "T004 Rename residentId → owner at apps/desktop/src/features/residents/components/access-event-sidebar.tsx"
Task: "T005 Extend VehicleManageList Vitest suite in packages/features/src/shared/vehicle-form/vehicle-manage-list.test.tsx"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1: Setup.
2. Phase 2: Foundational (CRITICAL — blocks all stories).
3. Phase 3: US1 (guard inline edit visit-person + provider vehicles).
4. Phase 4: US2 (API hardening for guard deletes).
5. **STOP and VALIDATE**: Run T009/T010/T012 and the US1 + US2 sections of T024 quickstart. The guard's "fix typo without leaving the sidebar" path is live; the API never permits a guard delete. SC-001, SC-002, SC-003 are met.
6. Optional: ship as an early increment.

### Incremental Delivery

1. **Foundation (Phase 2)** → ship the prop generalization with the two existing call-site renames and the test extension. No user-visible change yet, but the foundation is in place.
2. **+ US1** → guards can edit visit-person and provider vehicles inline post-creation. (MVP.)
3. **+ US2** → API rejects all guard deletes; tests confirm the symmetric coverage.
4. **+ US3** → admin user-catalog edit gains inline vehicle management for residents on web.
5. **+ US4** → admin visit-person/provider edit gains inline vehicle management on web and desktop; picker stale-selection cleanup deployed everywhere. Feature complete.

### Parallel Team Strategy

After Foundational completes:

- Developer A: US1 (T006 → then T007/T008/T009/T010 in parallel).
- Developer B: US2 (T011 → T012).
- Developer C: US3 (T013 → T014).
- Developer D: US4 — picks up T015/T016/T017 after Developer A's T006/T007/T008 land for those three files; T018/T019/T020 (picker cleanups) can start immediately once Foundational is done.

The only cross-story file conflicts are inside US1 ↔ US4 on `visit-person-sidebar.tsx`, web `provider-sidebar.tsx`, and desktop `provider-sidebar.tsx` — Developer A finishes those files (US1's view-state machine) before Developer D resumes them (US4's edit-mode embed). Otherwise, all four user stories edit pairwise-disjoint file sets.

---

## Notes

- [P] tasks edit different files and have no dependencies on incomplete tasks in the same phase.
- [Story] label maps each task to its user story for traceability; tasks in Setup, Foundational, and Polish phases have no story label.
- This feature introduces **zero new endpoints, zero new DTOs, zero new i18n keys, zero new dependencies, zero schema changes, zero new desktop outbox kinds**. All work is presentation-layer + a single API service rule tightening (FR-012).
- SC-006 regression test: the existing residents access-event-sidebar Vitest suite (`apps/web/src/features/residents/__tests__/`) MUST continue to pass after T002/T003/T004 without modification beyond the prop rename. This is the safety net for the prop generalization.
- The discriminated-union `owner` prop forces TypeScript narrowing at every call site — a missed call-site rename surfaces as a typecheck error, not a runtime bug.
- Commit guidance: after each user story phase, validate independently (run that story's tests + a smoke check on the affected UI surface) before moving to the next priority.
