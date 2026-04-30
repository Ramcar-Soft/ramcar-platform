# Feature Specification: Inline Vehicle Creation in Person Create Form

**Feature Branch**: `025-inline-vehicle-create`
**Created**: 2026-04-29
**Status**: Draft
**Input**: User description: "The module of create users(rol resident) or create visitor or service provider, should allow to create and associate a new vehicle in the same sidebar form, to prevent multiple step jumps when following the create flow, for example create visitor: Click create button, sidebar form opens with only visitor details -> click save -> the form is changed to record visit -> No vehicles -> click add vehicle -> display vehicle form -> save -> return to access log form. We want to allow to add vehicles in the same create user/visitor/service provider form. IMPORTANT: Guard roles cannot edit/add vehicles for residents, only admin and super admins, guards can only add/edit vehicles for visitors and service providers"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Guard registers a visitor with vehicle in one go (Priority: P1)

A guard at the booth is registering a visitor who arrives by car. Today the guard fills in the visitor's details, presses Save, the panel switches to the access-event step, the guard notices there are no vehicles on file, opens a separate "Add vehicle" view, fills in plate/brand/model/color, saves, returns to the access-event step, and only then can record entry. The guard wants to enter the visitor's details and the visitor's vehicle in a single uninterrupted form so the registration completes in one save and they can immediately record the entry without re-navigating.

**Why this priority**: This is the highest-volume flow on the platform — it runs every time a vehicle-borne visitor or provider arrives at a booth — and the multi-step jump is the friction the user explicitly called out. Solving this for visitors and providers delivers the bulk of the value; the resident flow (P2) reuses the same UI pattern with a different role gate.

**Independent Test**: A guard opens the visit-person create panel from the booth (or the web Visitors/Providers page), fills in the visitor's name and required fields, expands an "Add vehicle" sub-section, fills in plate, brand, model, and color, presses Save once, and verifies that (a) the visitor exists, (b) the vehicle exists and is associated with the visitor, (c) the access-event step opens with the just-created vehicle pre-selected.

**Acceptance Scenarios**:

1. **Given** a guard has the visitor create panel open with visitor details filled in, **When** they expand the inline "Add vehicle" sub-section, fill required vehicle fields (vehicle type and at least plate or brand+model per existing vehicle rules), and press Save, **Then** the system creates the visitor, creates the vehicle owned by that visitor, transitions to the access-event step, and pre-selects the newly created vehicle in the vehicle picker.
2. **Given** a guard has filled visitor details but has not added any vehicle, **When** they press Save, **Then** the system creates the visitor without any vehicle and transitions to the access-event step exactly as today (no regression).
3. **Given** a guard is filling the create form and has added a vehicle inline, **When** they remove the vehicle before pressing Save, **Then** no vehicle is created when the visitor is saved.
4. **Given** a guard pressed Save and the visitor was created successfully but the vehicle creation failed (e.g., duplicate plate), **When** the failure is detected, **Then** the user remains in the create panel with the visitor already created, the vehicle sub-section shows the validation error against the inline vehicle entry, and the user can correct and retry the vehicle save without re-entering visitor details.
5. **Given** a guard has the provider (service provider) create panel open, **When** they perform the same inline-vehicle flow, **Then** the system behaves identically to scenario 1 with the vehicle owned by the provider.

---

### User Story 2 - Admin creates a resident with their vehicle in one go (Priority: P2)

An admin or super-admin is onboarding a new resident in the web portal. They want to capture the resident's vehicle(s) in the same sidebar form rather than creating the resident first and then opening a separate vehicle management view.

**Why this priority**: The flow is structurally the same as P1 but for the resident catalog. It reuses the same inline-vehicle sub-section. It's P2 because resident onboarding is lower-volume than booth visitor registration and is performed by admins on the web portal, where the multi-step jump is less disruptive than at the booth.

**Independent Test**: An admin opens the user create sidebar from the Users catalog, selects role = resident, fills required resident fields, expands the inline "Add vehicle" sub-section, captures one or more vehicles, and presses Save. After save, the resident exists with the entered vehicles associated to them.

**Acceptance Scenarios**:

1. **Given** an admin has the user create sidebar open with role = resident and required resident fields filled, **When** they add a vehicle inline and press Save, **Then** the resident is created, the vehicle is created and owned by that resident, and the sidebar closes.
2. **Given** an admin is creating a resident and has added two vehicles inline, **When** they press Save, **Then** the resident is created with both vehicles associated to them.
3. **Given** an admin is creating a non-resident (role = admin, guard, or super-admin), **When** the create sidebar is open, **Then** the inline vehicle sub-section is hidden because vehicles only attach to residents (not to staff roles).

---

### User Story 3 - Guards cannot inline-create vehicles for residents (Priority: P1)

A guard role must never be able to add or edit a vehicle owned by a resident, including via the inline sub-section in the user create form. This must be enforced both as a UI rule (the sub-section is unavailable) and at the data boundary (any attempt to submit a resident-owned vehicle as a guard is rejected by the API).

**Why this priority**: This is a security/authorization invariant. It is P1 because it is an explicit constraint in the user request, it touches RBAC, and a regression here would let guards bypass an existing access-control boundary that today is enforced because vehicle add/edit is not reachable from the booth resident flow.

**Independent Test**: Sign in as a guard. Confirm: (a) the user create sidebar with role = resident does not show the inline vehicle sub-section (the standard expectation is that guards cannot create residents at all, but the sub-section must also not appear if the form is reachable). (b) Any direct API call attempting to create a resident-owned vehicle as a guard returns 403, matching today's behavior.

**Acceptance Scenarios**:

1. **Given** a guard is using the visitor or provider create panel, **When** they expand the inline vehicle sub-section, **Then** the sub-section is available and the guard can add a vehicle owned by the visitor/provider (matches today's permissions).
2. **Given** a guard reaches a user create form for role = resident (whether via UI, deep link, or otherwise), **When** the inline vehicle sub-section would be rendered, **Then** the sub-section is hidden and any submitted resident-owned vehicle payload is rejected with a forbidden response.
3. **Given** an admin or super-admin is using the user create sidebar with role = resident, **When** they expand the inline vehicle sub-section, **Then** the sub-section is fully available.

---

### Edge Cases

- **Vehicle save fails after person save succeeds**: The person record exists; the vehicle does not. The form must keep the user in the create panel, surface the vehicle-specific error inline, allow retry of the vehicle save (or removal of the vehicle entry), and avoid creating a duplicate person on retry.
- **User cancels the create panel after pressing Save once and failing on the vehicle**: The person already exists in the database. Closing the panel must not delete the person; it leaves a person with no vehicle, which the user can later edit through the existing vehicle management surface.
- **Multiple vehicles added inline, one fails**: The other vehicles that succeeded must remain associated to the person; the failing entry remains visible in the inline list with its error so the user can fix or remove it.
- **Guard tries to inline-add a vehicle for a visitor who is later edited to be flagged/rejected**: Out of scope — vehicle creation is governed by ownership, not by the visitor's status field.
- **Browser reload mid-form (web only)**: The web user form already restores draft text via existing draft-recovery; inline-vehicle drafts SHOULD be restored consistently with the rest of the form so the user does not lose entered vehicle fields. Desktop is not subject to browser reload and does not implement draft recovery.
- **Person create succeeds but the access-event transition (visitor/provider only) cannot pre-select the just-created vehicle**: Treat the vehicle as available in the picker but not pre-selected; do not block the access-event step.
- **Inline vehicle sub-section opened, fields partially entered, then user collapses or hides it without explicit removal**: Treat collapse as "discard inline vehicle" only if the user explicitly removes the entry; otherwise the entry persists and is submitted on Save. The chosen interaction must be unambiguous to the user.
- **Plate uniqueness conflicts at save time**: Surface the same conflict messaging as the standalone vehicle form does today.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The visitor and service-provider create panel (used in both the web portal and the desktop booth) MUST expose an inline "Add vehicle" sub-section within the same sidebar form, allowing the user to capture vehicle details before the first Save.
- **FR-002**: The user/resident create sidebar in the web portal MUST expose the same inline "Add vehicle" sub-section when the selected role is `resident`. The sub-section MUST be hidden when the selected role is anything other than `resident`.
- **FR-003**: Pressing Save in the create panel MUST persist the person and any inline vehicles in a single user-perceived action, so that on success the user does not need to navigate to a separate vehicle screen to associate vehicles already entered in the form.
- **FR-004**: After a successful visitor or provider create that included exactly one inline vehicle, the panel MUST transition to the access-event step with that vehicle pre-selected in the vehicle picker (mirroring today's "just created vehicle" pre-select behavior).
- **FR-005**: The inline vehicle sub-section MUST allow the user to add and remove vehicle entries before Save. Users MUST be able to capture more than one vehicle inline for residents (residents may own multiple vehicles); for visitors and providers, the system MUST support at least one inline vehicle and SHOULD permit additional entries with the same UI rules.
- **FR-006**: Vehicle field validation MUST reuse the existing vehicle validation rules (vehicle type required, year/plate/color/brand/model rules per existing schema). The inline sub-section MUST display field-level errors inline next to each vehicle entry.
- **FR-007**: When inline vehicle creation fails after the person was created, the system MUST keep the person record, keep the user in the create panel, display the failure against the vehicle entry, and allow the user to retry saving the vehicle or remove it without re-entering person fields.
- **FR-008**: Users with the `guard` role MUST NOT be able to create or edit a vehicle owned by a resident, including via the inline sub-section. The UI MUST hide the inline sub-section for guard role acting on resident persons, and the API MUST reject any such attempt with a forbidden response (existing API behavior; this requirement is to ensure the new UI does not bypass it).
- **FR-009**: Users with the `guard` role MUST be able to create vehicles inline for visitors and service providers (this matches today's permissions for vehicle creation against `visit_person` owners).
- **FR-010**: Users with `admin` or `super_admin` role MUST be able to create vehicles inline for residents, visitors, and service providers.
- **FR-011**: The inline sub-section MUST NOT introduce a separate full-screen or full-route navigation for vehicle entry; it MUST live entirely within the same right-side Sheet to honor the "Create/Edit forms — right-side Sheet, never a dedicated page" UI rule.
- **FR-012**: The inline sub-section MUST be implemented in the cross-app shared feature module for the visitors/providers case (so both web and desktop benefit from a single implementation) and in the per-app users feature for the resident case (residents are a single-app feature in the web portal). Both implementations MUST reuse the existing shared vehicle form component rather than fork its fields and validation.
- **FR-013**: The web user form's existing draft-recovery behavior MUST be preserved. Inline vehicle drafts on the web SHOULD be restorable consistently with the rest of the form draft. Desktop is not required to implement draft recovery (out of scope for desktop today).
- **FR-014**: When the visitor or provider was created with no inline vehicle, the panel MUST behave exactly as it does today — i.e., transition to the access-event step with no vehicle pre-selected, and the user can still use the existing standalone "Add vehicle" affordance from the access-event step.
- **FR-015**: Plate-uniqueness, ownership-binding, and any other server-side vehicle constraints MUST continue to be enforced server-side and surfaced as user-visible errors on the inline entry whose data caused the conflict.
- **FR-016**: The inline sub-section's vehicle save MUST go through the existing NestJS vehicle endpoints (per Principle VIII — API-First Data Access). Frontend code MUST NOT bypass the API to write directly to the database for vehicles or persons.
- **FR-017**: All user-facing strings introduced by the inline sub-section MUST be authored in the shared `@ramcar/i18n` catalog rather than duplicated in per-app message files.

### Key Entities *(include if feature involves data)*

- **Person (visitor / service provider / resident)**: The principal record being created in the form. Visitors and providers are `visit_persons`; residents are `profiles` rows with `role = resident`. Already exists; this feature does not change the schema.
- **Vehicle**: The vehicle record being created inline. Owned by exactly one principal — either a `user_id` (resident) or a `visit_person_id` (visitor/provider) — per the existing `createVehicleSchema` discriminated union. Already exists; this feature does not change the schema.
- **Inline Vehicle Entry (UI-only)**: A draft vehicle held in form state before Save. Has the same fields as a Vehicle but is not yet persisted. Exists only in the client during the create flow.

### Data Access Architecture *(mandatory for features involving data)*

| Operation | API Endpoint | HTTP Method | Request DTO | Response DTO |
|-----------|-------------|-------------|-------------|--------------|
| Create resident | `POST /api/users` (existing) | POST | `CreateUserInput` (Zod, existing) | `ExtendedUserProfile` (existing) |
| Create visitor / provider | `POST /api/visit-persons` (existing) | POST | `CreateVisitPersonInput` (Zod, existing) | `VisitPerson` (existing) |
| Create vehicle (owned by resident) | `POST /api/vehicles` (existing) | POST | `createVehicleSchema` with `ownerType: "user"` (existing) | `Vehicle` (existing) |
| Create vehicle (owned by visitor/provider) | `POST /api/vehicles` (existing) | POST | `createVehicleSchema` with `ownerType: "visitPerson"` (existing) | `Vehicle` (existing) |

This feature reuses existing endpoints and DTOs; no new endpoints, schemas, or DB migrations are introduced. The client orchestrates the person-then-vehicle calls in sequence inside one user-perceived Save action and surfaces partial-failure state per FR-007.

**Frontend data flow**: TanStack Query → NestJS API → Repository → Supabase/Postgres
**Allowed frontend Supabase usage**: Auth (`supabase.auth.*`) and Realtime (`supabase.channel()`) only

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Registering a vehicle-borne visitor at the booth (the P1 path) requires **one** Save action and **zero** screen transitions to a separate vehicle view, down from today's three steps (save person → switch view → save vehicle → switch back).
- **SC-002**: Time from clicking "Create visitor" to the access-event step being ready with the vehicle pre-selected drops by at least 40% relative to the current multi-step flow, measured on the same hardware and the same dataset of visitor + vehicle creations.
- **SC-003**: Zero visitor or provider records are created without their accompanying inline vehicle when the user pressed Save with both filled in successfully (no orphaned persons in the success path).
- **SC-004**: 100% of guard-initiated attempts to inline-create a vehicle for a resident are rejected by the API (forbidden), and the UI does not present the inline sub-section to a guard acting on a resident person.
- **SC-005**: No regression in the "no vehicle entered" path: a person created without an inline vehicle takes the same number of clicks as today and the access-event step (for visitors/providers) opens with the existing "no vehicles" affordance unchanged.
- **SC-006**: Booth users (guards) report the new flow as the preferred path over the multi-step flow on a post-rollout pulse, with at least 80% preference.

## Assumptions

- Vehicles are owned by exactly one principal (resident OR visit-person) per the existing `createVehicleSchema` discriminated union. This feature does not introduce a new ownership model.
- Visitor / provider creation is currently always online (no outbox path for create today, per spec 013). Inline vehicle creation in the visitor/provider create flow is therefore also online-only at the booth; this matches existing behavior and is not a new offline gap.
- "Same form" means the same right-side Sheet panel — not a literal single HTTP request. Persisting two records (person + vehicle) is acceptable as long as the user perceives one Save action and the failure handling in FR-007 applies.
- Plate is not strictly required to create a vehicle today (existing schema treats plate as optional under certain combinations). The inline form follows the existing rules; this feature does not tighten or loosen vehicle field requirements.
- Residents are managed only on the web portal today (the desktop booth does not have a "create resident" flow). The inline-vehicle work for residents is therefore web-only; the bi-app shared feature work targets only visitors and providers.
- Guards already cannot create or edit residents on the web users catalog; FR-008 is a defense-in-depth requirement to ensure the inline sub-section does not introduce a new path that bypasses the existing guard restriction on resident-owned vehicles.

## Dependencies

- Existing shared vehicle form component in `@ramcar/features/shared/vehicle-form` (reused, not forked).
- Existing visit-person create flow in `@ramcar/features/visitors` (extended with inline vehicle sub-section).
- Existing user create flow in `apps/web/src/features/users` (extended with inline vehicle sub-section gated to `role = resident`).
- Existing RBAC enforcement in `apps/api/src/modules/vehicles/vehicles.service.ts` that rejects guard-on-resident vehicle writes (no API change required, but this guarantee is load-bearing for FR-008).
- Shared i18n catalog `@ramcar/i18n` for any new user-facing strings.
