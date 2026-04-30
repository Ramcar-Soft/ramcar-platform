# Feature Specification: Inline Vehicle Edit and Delete in Person Sidebars

**Feature Branch**: `026-inline-vehicle-edit`
**Created**: 2026-04-29
**Status**: Draft
**Input**: User description: "with the changes of specs/025-inline-vehicle-create now I'm able to create cars in the same sidebar form for users(residents) and visitors or service providers, now I need to support edit the vehicle information, using the same component if possible of the one used in the 'visit and residents -> residents' sidebar, there is a list that display all the resident vehicles and allow to edit or delete. For admin and super admins, they can edit and delete, guard roles can only edit vehicle information from visitors or service providers, this to allow to fix any issues after the vehicle is created"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Guard fixes a typo on a vehicle right after creating it (Priority: P1)

A guard at the booth registers a visitor with a vehicle inline (per spec 025), the panel transitions to the access-event step, the guard glances at the vehicle picker and notices the plate they just entered has a typo. Today the guard cannot fix the plate from this panel — they would have to abandon the access-event flow and go through a separate vehicle management surface (which doesn't exist on the booth at all today). The guard wants to open the just-created vehicle, correct the plate, save, and return to the access-event step in the same sidebar.

**Why this priority**: This is the direct continuation of the spec 025 booth flow. The guard has just created the vehicle in the same sidebar; if it has a mistake, the friction of leaving the panel to fix it is the exact same friction spec 025 set out to remove. Solving this for visitors and providers at the booth — the highest-volume access surface — delivers the bulk of the value.

**Independent Test**: A guard creates a visitor with an inline vehicle and an intentional typo in the plate, the panel transitions to the access-event step, the guard opens the vehicle list inline, taps the pencil icon on the just-created vehicle, edits the plate, saves, and verifies that (a) the picker shows the corrected plate, (b) the access-event step is still ready for save, (c) no second vehicle was created.

**Acceptance Scenarios**:

1. **Given** a guard has just created a visitor with an inline vehicle and the access-event step is showing, **When** they open the inline vehicle list and select edit on the just-created vehicle, **Then** the sidebar shows the vehicle form pre-populated with the existing values for that vehicle.
2. **Given** the guard has the vehicle form open in edit mode, **When** they change plate, brand, model, color, or notes and press Save, **Then** the existing vehicle record is updated (no new record created), the panel returns to the access-event step, and the vehicle picker reflects the updated label.
3. **Given** the guard cancels the edit, **When** they press Cancel in the vehicle form, **Then** the form closes with no changes and the panel returns to the previous view.
4. **Given** the guard has multiple vehicles attached to the visitor (e.g., they came back later with a second vehicle), **When** they open the inline vehicle list, **Then** all vehicles for that visit-person are listed with edit affordances on each.

---

### User Story 2 - Guards cannot delete vehicles, even visitor or provider ones (Priority: P1)

The guard role must be able to fix typos on visitor/provider vehicles but must NOT be able to remove a vehicle record. Vehicle deletion is an audit-affecting action reserved for admin and super-admin. The constraint must be enforced both as a UI rule (guards do not see the delete affordance) and at the data boundary (any direct API delete attempt by a guard is rejected).

**Why this priority**: This is a security/authorization invariant. It is P1 because it is an explicit constraint in the user request, it touches RBAC, and a regression here would let a guard remove records that today they cannot remove from any UI surface.

**Independent Test**: Sign in as a guard. (a) On a visit-person sidebar with vehicles, the inline vehicle list MUST show the edit (pencil) icon on each row but MUST NOT show the delete (trash) icon. (b) Any direct API call to `DELETE /api/vehicles/:id` as a guard, regardless of whether the vehicle is owned by a resident or a visit-person, returns a forbidden response.

**Acceptance Scenarios**:

1. **Given** a guard opens a visit-person sidebar that has at least one vehicle, **When** the inline vehicle list renders, **Then** each row shows an edit affordance and no delete affordance.
2. **Given** a guard issues a direct API delete request for any vehicle (resident-owned or visit-person-owned), **When** the request reaches the API, **Then** the API returns a forbidden response and the vehicle remains intact.
3. **Given** an admin or super-admin opens the same sidebar, **When** the inline vehicle list renders, **Then** each row shows both edit and delete affordances.

---

### User Story 3 - Admin manages resident vehicles inline in the user catalog edit sidebar (Priority: P2)

An admin or super-admin opens an existing resident from the Users catalog. They want to see the resident's vehicles directly in the edit sidebar and be able to fix details (e.g., new plate after a renewal) or delete a vehicle the resident no longer owns — without leaving the sidebar.

**Why this priority**: This is the resident-side counterpart to User Story 1. It reuses the same vehicle list/edit UI but in the user catalog edit flow on the web. It is P2 because resident maintenance is lower-volume than booth visitor registration and admins on the web portal already have alternative surfaces (the access-event sidebar lists resident vehicles for management); this work consolidates the experience without changing the workflow's criticality.

**Independent Test**: Sign in as an admin, open the Users catalog, click a resident row to open the edit sidebar, and verify (a) a vehicle list section appears, (b) each row exposes edit and delete actions, (c) saving an edit updates the vehicle record, (d) deleting a vehicle removes it after confirmation, (e) the user (resident) record itself is not affected by either action.

**Acceptance Scenarios**:

1. **Given** an admin has the user edit sidebar open for a resident with at least one vehicle, **When** the sidebar renders, **Then** a vehicle list section is shown with each vehicle, including edit and delete actions per row.
2. **Given** the admin clicks edit on a vehicle, **When** the vehicle form opens, **Then** it is pre-populated with the existing vehicle values; saving the form updates the vehicle and returns the user to the vehicle list.
3. **Given** the admin clicks delete on a vehicle, **When** they confirm in the deletion dialog, **Then** the vehicle is removed and the list refreshes; if they cancel the dialog, no change is made.
4. **Given** the user being edited is not a resident (i.e., role is admin, guard, or super-admin), **When** the edit sidebar renders, **Then** no vehicle list section is shown (vehicles only attach to residents).
5. **Given** a guard somehow reaches a user edit sidebar for a resident, **When** the sidebar renders, **Then** the vehicle list section is NOT shown (the guard already cannot create or edit residents per existing rules; this is defense-in-depth).

---

### User Story 4 - Admin manages visitor/provider vehicles inline in the visit-person edit sidebar (Priority: P2)

An admin or super-admin opens an existing visitor or service provider from the Visitors catalog. They want to see the visit-person's vehicles directly in the edit sidebar and be able to fix details or delete a vehicle that should no longer be associated.

**Why this priority**: Symmetrical to User Story 3 but for the visit-person catalog. P2 because admin-side visit-person maintenance is lower-volume than booth registration (User Story 1); admins already have the access-event view on the booth path for read access to a visit-person's vehicles, but no edit surface today.

**Independent Test**: Sign in as an admin, open the Visitors (or Service Providers) catalog, click a row to open the edit sidebar, and verify (a) a vehicle list section appears alongside the visit-person edit form, (b) each row exposes edit and delete actions, (c) edit and delete operate on the existing records without affecting the visit-person record itself.

**Acceptance Scenarios**:

1. **Given** an admin has the visit-person edit sidebar open for a visitor with at least one vehicle, **When** the sidebar renders, **Then** a vehicle list section is shown with edit and delete actions per row.
2. **Given** the admin edits a vehicle and saves, **When** the save completes, **Then** the vehicle record is updated and the list reflects the new values.
3. **Given** the admin deletes a vehicle and confirms, **When** the deletion completes, **Then** the vehicle no longer appears in the list and is no longer selectable in any access-event picker for that visit-person.

---

### Edge Cases

- **Vehicle has access events associated with it**: Deletion uses the existing soft-delete behavior of the vehicles API. A deleted vehicle no longer appears in active vehicle lists or pickers; existing access-event records that referenced the vehicle continue to display the historical vehicle label as they do today (this feature does not change deletion semantics, only adds a new entry point).
- **Concurrent edit conflict**: Another admin updates the same vehicle between when this sidebar loaded the data and when the user pressed Save. The server-side response surfaces the conflict; the UI keeps the user in the edit form with the error visible so they can re-fetch and retry. This matches the existing `VehicleForm` edit-mode behavior — no new conflict handling is introduced.
- **Vehicle currently selected in the access-event picker is deleted**: The picker selection becomes stale. The picker MUST refresh to drop the deleted vehicle from its options; if the deleted vehicle was the pre-selected entry, the selection becomes empty and the user must pick another or proceed with no vehicle.
- **Guard attempts to call delete API directly**: API rejects with forbidden, regardless of vehicle owner type. The UI never exposed the action to the guard, so this is a defense-in-depth failure mode.
- **Empty vehicle list**: The section renders an empty-state message ("no vehicles" — using the existing `vehicles.manage.empty` string) rather than hiding the section entirely; this keeps the affordance discoverable for adding the first vehicle.
- **Editing a vehicle while the panel is in CREATE mode for the person**: Out of scope. In create mode the person does not yet exist, so existing vehicles cannot be associated to it. The inline draft list from spec 025 governs vehicle data in create mode; the edit list only applies after the person record exists (i.e., view or edit modes).
- **Admin edits a vehicle and the form is pre-populated with stale data because the cache was invalidated by another action**: TanStack Query's existing refetch semantics apply; the edit form opens with whatever the current cached data shows, and the user can manually refresh by closing/reopening if needed. No new cache strategy is introduced.
- **Desktop offline: edit or delete attempted while offline**: Edit and delete go through the existing transport adapter (HTTP for web, outbox-backed for desktop). If the desktop transport currently supports `vehicle.update` and `vehicle.delete` outbox kinds, the action queues; if not, the action surfaces an offline-not-supported error consistent with today's offline gaps. This spec does not introduce new offline operations; it reuses whatever the existing transport supports for `PATCH /api/vehicles/:id` and `DELETE /api/vehicles/:id`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The visit-person sidebar (used in both the web portal and the desktop booth) MUST expose an inline vehicle list section that displays every vehicle currently associated with the visit-person being viewed or edited.
- **FR-002**: The inline vehicle list section in the visit-person sidebar MUST be available in both the post-creation view (the access-event recording flow) and the edit mode, so a user can fix typos right after creating the vehicle (P1) and at any later point (P2).
- **FR-003**: The user (resident) edit sidebar in the web portal MUST expose an inline vehicle list section that displays every vehicle currently associated with the resident being edited. The section MUST NOT be shown when the user being edited has a non-resident role.
- **FR-004**: The inline vehicle list MUST reuse the same component currently used in the `apps/web/src/features/residents/components/access-event-sidebar.tsx` ("visits-and-residents → residents" sidebar) — specifically the shared `VehicleManageList` component — rather than introducing a parallel implementation.
- **FR-005**: Each row in the inline vehicle list MUST show the vehicle label (brand, model, plate, color) consistent with how the rest of the application formats vehicle labels.
- **FR-006**: For users with role `admin` or `super_admin`, each row MUST expose both an edit action (pencil) and a delete action (trash). The actions apply equally to resident-owned and visit-person-owned vehicles.
- **FR-007**: For users with role `guard`, each row MUST expose only the edit action. The delete action MUST NOT be rendered to a guard.
- **FR-008**: For users with role `guard`, the entire vehicle list section MUST be hidden when the owner is a resident (matching the existing rule that guards cannot manage resident vehicles).
- **FR-009**: Selecting the edit action MUST open the existing vehicle form (the same form used to create vehicles inline in spec 025) in edit mode, pre-populated with the current values, and saving MUST update the existing record via the existing vehicle update endpoint.
- **FR-010**: Selecting the delete action MUST require an explicit confirmation in a dialog before the request is sent. Cancelling the dialog MUST leave the vehicle intact. Confirming MUST issue the deletion via the existing vehicle deletion endpoint and refresh the list.
- **FR-011**: After a successful edit or delete, the vehicle list and any access-event vehicle picker visible in the same sidebar MUST refresh so the change is reflected without requiring a full panel close-and-reopen.
- **FR-012**: The API MUST reject any vehicle delete request from a user with role `guard`, regardless of whether the vehicle is owned by a resident or a visit-person. (Today the API blocks guard-on-resident vehicle deletes only; this spec extends that rule to all vehicle deletes by guards.)
- **FR-013**: The API MUST continue to reject any vehicle update request from a user with role `guard` when the vehicle is owned by a resident (existing rule, preserved). It MUST continue to permit guard updates for visit-person-owned vehicles (existing rule, preserved).
- **FR-014**: The inline vehicle list section MUST NOT introduce a separate full-screen or full-route navigation; it MUST live entirely within the same right-side Sheet to honor the "Create/Edit forms — right-side Sheet, never a dedicated page" UI rule.
- **FR-015**: The visit-person variant of this work MUST be implemented in the cross-app shared feature module (so both web and desktop benefit from a single implementation) and MUST NOT be duplicated in `apps/web/src/features/visitors/` or `apps/desktop/src/features/visitors/`.
- **FR-016**: The user (resident) variant of this work MUST be implemented in the per-app users feature in the web portal (residents are a single-app feature today) and MUST reuse the same shared `VehicleManageList` component — not fork it.
- **FR-017**: Edit and delete operations MUST go through the existing NestJS vehicle endpoints (per Principle VIII — API-First Data Access). Frontend code MUST NOT bypass the API to write directly to the database.
- **FR-018**: All user-facing strings introduced by the inline vehicle list (e.g., section title, empty-state message, deletion confirmation dialog) MUST be authored in the shared `@ramcar/i18n` catalog rather than duplicated in per-app message files. Reuse of existing keys (`vehicles.manageTitle`, `vehicles.manage.empty`, `vehicles.deleteConfirm.*`, `vehicles.messages.deleted`, `vehicles.messages.errorDeleting`, `vehicles.messages.forbidden`) is preferred over introducing new keys.
- **FR-019**: When a guard attempts a forbidden vehicle action via the API and the API returns a forbidden response, the UI MUST surface the existing forbidden message (the `vehicles.messages.forbidden` toast) consistently with how the same response is handled today in the residents access-event sidebar.
- **FR-020**: The inline vehicle list in the visit-person sidebar's view (post-creation) mode MUST NOT replace or remove the existing "Add vehicle" affordance reachable from the access-event step. Adding vehicles after creation continues to work the same way it does today.

### Key Entities *(include if feature involves data)*

- **Vehicle**: The vehicle record being edited or deleted. Owned by exactly one principal — either a `user_id` (resident) or a `visit_person_id` (visitor/provider) — per the existing schema. Already exists; this feature does not change the schema.
- **Person (resident / visit-person)**: The principal whose vehicles are listed. Already exists; this feature does not modify the person record as part of vehicle edit or delete.

### Data Access Architecture *(mandatory for features involving data)*

| Operation | API Endpoint | HTTP Method | Request DTO | Response DTO |
|-----------|-------------|-------------|-------------|--------------|
| List vehicles for a resident | `GET /api/vehicles?userId=…` (existing) | GET | n/a (query string) | `Vehicle[]` (existing) |
| List vehicles for a visit-person | `GET /api/vehicles?visitPersonId=…` (existing) | GET | n/a (query string) | `Vehicle[]` (existing) |
| Update an existing vehicle | `PATCH /api/vehicles/:id` (existing) | PATCH | `updateVehicleSchema` (existing) | `Vehicle` (existing) |
| Delete an existing vehicle | `DELETE /api/vehicles/:id` (existing) | DELETE | n/a | n/a (204) |

This feature reuses existing endpoints and DTOs; no new endpoints, schemas, or DB migrations are introduced. The single behavior change at the API is FR-012: extending the existing forbidden rule on vehicle delete to cover all guard delete attempts (today the rule fires only when the vehicle is resident-owned).

**Frontend data flow**: TanStack Query → NestJS API → Repository → Supabase/Postgres
**Allowed frontend Supabase usage**: Auth (`supabase.auth.*`) and Realtime (`supabase.channel()`) only

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A guard can correct a typo on a vehicle they just inline-created (per spec 025) without leaving the visit-person sidebar — measured by zero panel close-and-reopen cycles between vehicle creation and successful edit save.
- **SC-002**: Time from noticing an incorrect vehicle field to having it corrected and the access-event step ready to save drops by at least 50% relative to the current "abandon and re-register" workaround, measured on the same hardware and the same dataset of guard-driven corrections.
- **SC-003**: Zero vehicle delete requests from guard accounts succeed at the API; 100% return forbidden — verified by both UI tests (delete affordance never visible to guards) and API tests (direct DELETE call returns forbidden).
- **SC-004**: Zero unintended modifications to the person record (resident profile or visit-person record) occur during a vehicle edit or delete — i.e., person-level fields like name, status, or notes remain unchanged when only vehicle operations are performed.
- **SC-005**: Admins and super-admins report task completion of "edit a resident's vehicle" in under 30 seconds from opening the user catalog row to seeing the updated value in the list, on a post-rollout pulse — at least 90% of attempts.
- **SC-006**: No regression in the existing residents access-event sidebar flow (the sidebar this work draws its component from): the same `VehicleManageList` continues to render, behave, and be permission-gated identically for the resident access-event surface.

## Assumptions

- Vehicles are owned by exactly one principal (resident OR visit-person) per the existing schema discriminated union. This feature does not introduce a new ownership model.
- The existing `VehicleManageList` component is structured to accept an owner identifier (today: `residentId`) and a list of vehicles. Generalizing it to also accept a visit-person owner is a refactoring concern that lives in the planning phase; this spec mandates that the same component is reused (FR-004) but does not prescribe how the prop surface changes.
- Soft-delete behavior of vehicles is preserved by this feature. The existing API returns 204 on a successful soft delete, the row is marked deleted, and historical access-event records continue to display the deleted vehicle's last-known label. No change to deletion semantics is introduced.
- Vehicle edit and delete from the booth desktop app use whichever transport path the existing `VehicleManageList` already uses (HTTP today, since the resident access-event flow it serves is web-only). Bringing this surface to desktop will use the same transport adapter the rest of the visit-person feature already uses; if the adapter does not currently route `vehicle.update` or `vehicle.delete` through the offline outbox, both operations will require online connectivity at the booth — this matches the existing offline gap for visit-person creation and is not made worse by this spec.
- "Edit" in the user's request, when applied to guards on visitor/provider vehicles, means update only — not delete. The contrast with "edit and delete" granted to admins/super-admins is intentional and is reflected in FR-007 (UI hides delete from guards) and FR-012 (API rejects guard deletes outright).
- The existing access-event sidebar for residents (`apps/web/src/features/residents/components/access-event-sidebar.tsx`) already exposes the manage flow used as the reference; this spec does not change that surface other than to ensure the shared component remains backward-compatible (SC-006).
- Guards already cannot reach the user catalog edit sidebar for residents under existing role rules; FR-008 is a defense-in-depth requirement to ensure that even if the sidebar were rendered for a guard, the vehicle list section would not be visible.

## Dependencies

- Existing shared `VehicleManageList` component in `@ramcar/features/shared/vehicle-form/vehicle-manage-list.tsx` (reused, possibly generalized to support visit-person owners; not forked).
- Existing shared `VehicleForm` component in `@ramcar/features/shared/vehicle-form/vehicle-form.tsx` (reused in edit mode for the per-row edit action).
- Existing visit-person sidebar in `@ramcar/features/visitors` (extended with the inline list section in view and edit modes).
- Existing user edit sidebar in `apps/web/src/features/users` (extended with the inline list section when the edited user is a resident).
- Existing RBAC enforcement in `apps/api/src/modules/vehicles/vehicles.service.ts` (extended per FR-012 to forbid all guard deletes, not just guard deletes of resident-owned vehicles).
- Shared i18n catalog `@ramcar/i18n` for any user-facing strings (FR-018 reuses existing keys where possible).
- Spec 025 (`025-inline-vehicle-create`) — this feature is the natural continuation: spec 025 introduced inline vehicle create; this spec introduces inline vehicle edit and delete in the same sidebars.
