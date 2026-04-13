# Feature Specification: Visitor & Service Provider Access Logging

**Feature Branch**: `011-visitor-provider-access`  
**Created**: 2026-04-10  
**Status**: Draft  
**Input**: User description: "Add visitor and service provider submodules under visits-and-residents for guards to log access events"

## User Scenarios & Testing

### User Story 1 - Log Access Event for Existing Visitor (Priority: P1)

A guard at the gate needs to quickly log the entry of a previously registered visitor. They open the "Visitante" submodule, find the visitor in the list, and record their entry with vehicle and notes.

**Why this priority**: This is the core daily workflow — guards log dozens of visitor entries per shift. Speed and ergonomics directly impact gate throughput.

**Independent Test**: Can be fully tested by registering a visitor in the DB, navigating to the Visitante page, clicking the visitor row, filling the access event form, and verifying the event is persisted and the sidebar closes with a confirmation toast.

**Acceptance Scenarios**:

1. **Given** a guard is on the Visitante page and visitors exist, **When** they click a visitor row, **Then** a right sidebar slides in with the person's info and an access event form.
2. **Given** the sidebar is open for a visitor, **When** the guard selects direction "entry", access mode "vehicle", chooses a vehicle, and saves, **Then** an access event is created, the sidebar closes automatically, and a success toast is displayed.
3. **Given** the sidebar is open for a visitor, **When** the guard selects access mode "pedestrian", **Then** the vehicle selection is hidden and the form can be saved without a vehicle.
4. **Given** the access event was saved, **When** the guard opens the same visitor again, **Then** the most recent access events are visible in the sidebar header area.

---

### User Story 2 - Log Access Event for Existing Service Provider (Priority: P1)

A guard logs the entry of a previously registered service provider (delivery, maintenance, government). The flow mirrors the visitor flow but uses the "Proveedor" submodule and shows provider-specific details (company, phone).

**Why this priority**: Equally critical to visitor logging — providers enter daily (deliveries, utilities, maintenance). Same core workflow, different data.

**Independent Test**: Can be fully tested by navigating to the Proveedor page, clicking a provider row, filling the form, and verifying the access event is created with `person_type = 'service_provider'`.

**Acceptance Scenarios**:

1. **Given** a guard is on the Proveedor page, **When** they click a provider row, **Then** the sidebar shows the provider's name, company, phone, and the access event form.
2. **Given** the sidebar is open for a provider, **When** the guard saves a valid access event, **Then** the event is stored with `person_type = 'service_provider'` and the sidebar closes with a success toast.
3. **Given** a provider has no `resident_id`, **When** the sidebar opens, **Then** the "resident visited" field is show and it can be updated, but service providers can enter without visiting a resident, field is not required.

---

### User Story 3 - Register a New Visitor and Log First Access Event (Priority: P2)

A first-time visitor arrives who is not yet in the system. The guard needs to register this person and immediately log their entry in one continuous workflow.

**Why this priority**: High value because every visitor starts as "new" — without this, the list is empty and Story 1 cannot function. However, once visitors are registered, the core workflow (Story 1) is used far more frequently.

**Independent Test**: Can be fully tested by clicking "Register New" on the Visitante page, filling the person registration fields and access event form, and verifying both a visit person record and an access event record are created.

**Acceptance Scenarios**:

1. **Given** the guard is on the Visitante page, **When** they click a "Register New" action, **Then** the sidebar opens with empty person registration fields (full name, status, resident being visited, notes) and the access event form below.
2. **Given** the sidebar is in "new visitor" mode, **When** the guard fills all required fields (full name, resident, direction) and saves, **Then** a visit person record is created with type "visitor", an auto-generated code (e.g., VIS-00001), and an access event record is created simultaneously.
3. **Given** the guard is registering a new visitor, **When** they want to add a vehicle, **Then** the inline vehicle registration form appears (using the existing reusable VehicleForm component), and the vehicle is linked to the newly created visit person.

---

### User Story 4 - Register a New Service Provider and Log First Access Event (Priority: P2)

Same as Story 3 but for service providers. The form shows provider-specific fields (company, phone) instead of "resident visited."

**Why this priority**: Same reasoning as Story 3 — needed to bootstrap the provider list.

**Independent Test**: Can be fully tested by registering a new provider with company and phone, verifying the visit person record has type "service_provider" and code prefix "PRV-".

**Acceptance Scenarios**:

1. **Given** the guard clicks "Register New" on the Proveedor page, **When** the sidebar opens, **Then** it shows fields: full name, phone, company, status, notes, and the access event form.
2. **Given** the guard fills required fields and saves, **Then** a visit person record with type "service_provider" is created, auto-generating a code like PRV-00001.
3. **Given** the provider is being registered for the first time, **When** the guard needs to register a vehicle, **Then** the inline vehicle form appears and the vehicle is created linked to the visit person.

---

### User Story 5 - Search and Filter the Person List (Priority: P2)

The guard needs to quickly find a specific visitor or provider from a potentially large list using free-text search across all person attributes.

**Why this priority**: Directly impacts guard efficiency — at busy gates, the list may contain hundreds of entries. Search is essential for sub-5-second lookup.

**Independent Test**: Can be fully tested by typing a partial name, phone number, or company name and verifying the table filters to matching results.

**Acceptance Scenarios**:

1. **Given** the Visitante or Proveedor list is displayed, **When** the guard types in the search input, **Then** the list is filtered in real time (debounced) matching any of: full name, code, phone, or company.
2. **Given** the guard has typed a search query, **When** results are shown, **Then** the table updates with matching rows and the total count reflects filtered results.
3. **Given** the search returns no results, **When** the guard looks at the table, **Then** an empty state message is shown with a suggestion to register a new person.

---

### User Story 6 - Keyboard-Driven Navigation (Priority: P3)

Guards at the desktop booth need to operate the interface without a mouse for speed. Keyboard shortcuts allow focusing the search, navigating rows, and opening the sidebar.

**Why this priority**: Ergonomic optimization for power users (booth guards). The feature works without shortcuts (click-based), but shortcuts significantly speed up the workflow.

**Independent Test**: Can be fully tested by pressing B to focus search, typing a name, pressing ArrowDown to navigate, and Enter to select — verifying the sidebar opens.

**Acceptance Scenarios**:

1. **Given** the sidebar is not open and no input is focused, **When** the guard presses `B`, **Then** the search input receives focus.
2. **Given** the search input is focused and results are shown, **When** the guard presses `ArrowDown` or `ArrowUp`, **Then** the highlighted row changes visually to indicate the current selection.
3. **Given** a row is highlighted via keyboard, **When** the guard presses `Enter`, **Then** the sidebar opens for the highlighted person (same behavior as clicking the row).
4. **Given** the search input is focused, **When** the guard presses `Escape`, **Then** the search input loses focus.
5. **Given** the sidebar is open, **When** the guard presses any shortcut key (B, arrows, Enter), **Then** the shortcuts are disabled (no interference with form inputs).

---

### User Story 7 - Edit an Existing Access Event (Priority: P3)

An admin or guard needs to correct a previously logged access event (wrong direction, wrong vehicle, missing notes).

**Why this priority**: Important for data accuracy but happens infrequently compared to creating events. Guards occasionally make mistakes that need correction.

**Independent Test**: Can be fully tested by opening a person's sidebar, viewing recent events, clicking edit on one, modifying a field, saving, and verifying the change persists.

**Acceptance Scenarios**:

1. **Given** the sidebar is open showing a person's recent access events, **When** the guard clicks an edit action on a past event, **Then** the form switches to edit mode with pre-filled fields.
2. **Given** the form is in edit mode, **When** the guard changes direction or vehicle and saves, **Then** the access event is updated and the sidebar reflects the change.
3. **Given** the guard is editing an access event, **When** they cancel the edit, **Then** the form reverts to the "create new" state without modifying the existing event.

---

### User Story 8 - Inline Vehicle Registration (Priority: P2)

When logging an access event for a visitor or provider who has no registered vehicles, the guard can register a new vehicle directly within the sidebar without leaving the page.

**Why this priority**: Essential for the "vehicle" access mode — without this, guards would need to switch context to register vehicles separately, breaking the workflow.

**Independent Test**: Can be fully tested by selecting a person with no vehicles, choosing access mode "vehicle", clicking "Add Vehicle", filling the vehicle form, saving, and verifying the vehicle appears in the selection dropdown.

**Acceptance Scenarios**:

1. **Given** a visitor/provider has no vehicles and access mode is "vehicle", **When** the guard views the vehicle section, **Then** a message indicates no vehicles exist and an "Add Vehicle" button is shown.
2. **Given** the guard clicks "Add Vehicle", **Then** the existing reusable VehicleForm component replaces the access event form (same pattern as residents sidebar).
3. **Given** the guard saves a new vehicle, **Then** the VehicleForm closes, the vehicle dropdown reloads with the new vehicle auto-selected, and the access event form reappears.
4. **Given** a visitor/provider already has one or more vehicles, **When** they still want to add another, **Then** a link/button below the vehicle dropdown allows adding more vehicles.

---

### Edge Cases

- What happens when a guard tries to register a visitor whose name matches a blacklisted person? The system should display a warning indicator but not block registration (the status field handles this).
- What happens when the guard loses network connectivity during save? The form data should be persisted locally (using the existing form persistence hook) so it can be retried.
- What happens when two guards simultaneously register the same first-time visitor? The auto-generated code trigger handles sequential numbering at the DB level; the second save may create a duplicate person record. Deduplication is deferred to a future feature.
- What happens when a person's status is "denied"? The person still appears in the list but with a visual "denied" badge. The guard can still log an access event (they may need to log an exit for someone denied entry).
- What happens when the vehicle form is showing and the guard presses Escape? The vehicle form should close and return to the access event form.

## Requirements

### Functional Requirements

- **FR-001**: System MUST display a paginated list of registered visitors in the Visitante submodule, filtered by the current tenant.
- **FR-002**: System MUST display a paginated list of registered service providers in the Proveedor submodule, filtered by the current tenant.
- **FR-003**: System MUST provide free-text search that filters visitors/providers by matching against full name, code, phone, and company fields.
- **FR-004**: System MUST show a right sidebar (Sheet component) with slide-in animation when a person is selected from the list.
- **FR-005**: The sidebar MUST display the selected person's information (name, code, status, and type-specific fields) in a read-only header section.
- **FR-006**: The sidebar MUST contain an access event form with fields: direction (entry/exit), access mode (vehicle/pedestrian), vehicle selection (when mode is vehicle), and notes.
- **FR-007**: System MUST allow registering a new visitor with fields: full name (required), status (defaults to "allowed"), resident being visited (searchable selection of residents), and notes.
- **FR-008**: System MUST allow registering a new service provider with fields: full name (required), phone, company, status (defaults to "allowed"), resident being visited (optional — providers can enter without visiting a specific resident), and notes.
- **FR-009**: System MUST auto-generate visit person codes with prefix "VIS-" for visitors and "PRV-" for providers, followed by a zero-padded 5-digit sequence number per tenant and type.
- **FR-010**: When a visitor or provider has no registered vehicles and access mode is "vehicle", the system MUST display the reusable VehicleForm component inline within the sidebar.
- **FR-011**: After saving a new vehicle, the system MUST return to the access event form with the new vehicle auto-selected in the dropdown.
- **FR-012**: After successfully saving an access event, the sidebar MUST close automatically and a confirmation toast MUST be displayed.
- **FR-013**: System MUST support keyboard shortcuts when the sidebar is closed: `B` to focus search, `ArrowUp`/`ArrowDown` to navigate table rows, `Enter` to open sidebar for highlighted row, `Escape` to blur search input.
- **FR-014**: Keyboard shortcuts MUST be disabled when the sidebar is open (to prevent interference with form inputs).
- **FR-015**: System MUST allow editing previously created access events (direction, access mode, vehicle, notes).
- **FR-016**: The Visitante and Proveedor submenus MUST appear under the "visits-and-residents" sidebar menu group, visible to users with roles: super_admin, admin, guard.
- **FR-017**: System MUST display the person's status with visual indicators: "allowed" (positive/green), "flagged" (warning/yellow), "denied" (negative/red). Any guard, admin, or super_admin can set any status value during registration or when editing an existing person.
- **FR-018**: System MUST display the person's most recent access events in the sidebar (same pattern as the existing residents sidebar).
- **FR-019**: The feature MUST work on both web (Next.js) and desktop (Electron) platforms.
- **FR-020**: System MUST persist form draft data locally (using existing form persistence pattern) so guards don't lose input on accidental navigation.
- **FR-021**: Vehicles registered for visitors/providers MUST be linked via visit_person_id (not user_id), following the dual-ownership pattern in the vehicles table.
- **FR-022**: When creating an access event for a visitor, the system MUST store person_type as "visitor" and link via visit_person_id; for providers, person_type as "service_provider" and link via visit_person_id.
- **FR-023**: Both visitor and service provider registration forms MUST allow attaching images of types: face, ID card, vehicle plate, and other. All image types are optional — the form MUST encourage capture (visible upload/capture area) but MUST NOT block registration if no images are attached. Images are stored as references in the visit_person_images entity with actual files in private cloud storage.
- **FR-024**: On the desktop platform, image capture MUST support live webcam capture (primary) with file upload as a fallback. On the web platform, image capture MUST use file upload only.
- **FR-025**: When viewing an existing visitor/provider in the sidebar, guards MUST be able to view previously captured images, add new images for types not yet captured, and replace an existing image of the same type (the old image is overwritten). Guards MUST NOT be able to delete images without replacing them.
- **FR-026**: On the desktop platform, all write operations (person registration, access event creation, vehicle creation, and image capture) MUST work offline. Data MUST be cached locally and synchronized to the server when connectivity is restored, using the existing outbox pattern with idempotent event IDs.

### Key Entities

- **Visit Person**: Master registry of non-resident persons who enter the community. Key attributes: code (auto-generated, e.g. VIS-00001), type (visitor or service_provider), status (allowed/flagged/denied), full_name, phone, company (providers only), resident being visited (visitors only, optional for providers). One record per person per tenant.
- **Vehicle**: Universal vehicle registry shared between residents and visit persons. Linked to a visit person for vehicles belonging to visitors/providers. Key attributes: vehicle_type (car, motorcycle, pickup_truck, truck, bicycle, scooter, other), brand, model, plate, color, notes.
- **Access Event**: Entry/exit log — the source of truth for gate activity. Links to a visit person for visitors/providers. Key attributes: person_type, direction (entry/exit), access_mode (vehicle/pedestrian), vehicle used, notes, source (web/desktop), guard who registered the event.
- **Visit Person Image**: Photo captured during person registration. Linked to a visit person. Key attributes: image_type (face, id_card, vehicle_plate, other), storage reference. One person can have multiple images of different types. Actual files stored in private cloud storage.

### Data Access Architecture

| Operation                        | API Endpoint                                  | HTTP Method | Request DTO            | Response DTO                  |
|----------------------------------|-----------------------------------------------|-------------|------------------------|-------------------------------|
| List visitors                    | GET /api/visit-persons?type=visitor           | GET         | VisitPersonFiltersDto  | PaginatedResponse<VisitPerson> |
| List providers                   | GET /api/visit-persons?type=service_provider  | GET         | VisitPersonFiltersDto  | PaginatedResponse<VisitPerson> |
| Get visit person by ID           | GET /api/visit-persons/:id                    | GET         | -                      | VisitPerson                   |
| Create visit person              | POST /api/visit-persons                       | POST        | CreateVisitPersonDto   | VisitPerson                   |
| Update visit person              | PATCH /api/visit-persons/:id                  | PATCH       | UpdateVisitPersonDto   | VisitPerson                   |
| Search visit persons             | GET /api/visit-persons?search=term            | GET         | VisitPersonFiltersDto  | PaginatedResponse<VisitPerson> |
| List vehicles for visit person   | GET /api/vehicles?visitPersonId=:id           | GET         | -                      | Vehicle[]                     |
| Create vehicle for visit person  | POST /api/vehicles                            | POST        | CreateVehicleDto       | Vehicle                       |
| Create access event              | POST /api/access-events                       | POST        | CreateAccessEventDto   | AccessEvent                   |
| Update access event              | PATCH /api/access-events/:id                  | PATCH       | UpdateAccessEventDto   | AccessEvent                   |
| Recent events for visit person   | GET /api/access-events/recent-visit-person/:id | GET        | -                      | AccessEvent[]                 |
| Upload visit person image        | POST /api/visit-persons/:id/images             | POST       | Multipart (file + type) | VisitPersonImage              |
| List visit person images         | GET /api/visit-persons/:id/images              | GET        | -                      | VisitPersonImage[]            |
| Delete visit person image        | DELETE /api/visit-person-images/:id            | DELETE     | -                      | -                             |

**Frontend data flow**: TanStack Query -> NestJS API -> Repository -> Supabase/Postgres  
**Allowed frontend Supabase usage**: Auth (`supabase.auth.*`) and Realtime (`supabase.channel()`) only

## Success Criteria

### Measurable Outcomes

- **SC-001**: Guards can find and log an access event for an existing visitor or provider within 10 seconds from page load (search, select, fill, save).
- **SC-002**: Registering a new visitor or provider AND logging their first access event completes in under 30 seconds.
- **SC-003**: The keyboard-only workflow (B -> type name -> ArrowDown -> Enter -> fill form -> Save) works end-to-end without requiring mouse interaction.
- **SC-004**: 100% of access events created from the visitor/provider submodules are correctly stored with the appropriate person type, visit person reference, and tenant isolation.
- **SC-005**: The feature works identically on web and desktop platforms — same UI, same data flow, same keyboard shortcuts.
- **SC-006**: Form data persists across accidental page navigation or sidebar closure (draft restoration).
- **SC-007**: All person lists support pagination and free-text search with results appearing within 1 second of the user stopping typing.

## Assumptions
- **Blacklist checking** at registration time is deferred. The blacklist table and matching queries exist in the schema but real-time blacklist validation during registration is a separate feature. The status field on visit persons (allowed/flagged/denied) can be set manually by the guard for now.
- The "resident being visited" field for visitors uses a searchable dropdown populated from the existing residents list endpoint.
- The existing reusable VehicleForm component will be extended to accept a visit person identifier in addition to the current user identifier, enabling vehicle creation for both residents and visit persons.
- The access event creation schema will be extended to support a visit person reference as an alternative to a user reference, with the appropriate constraint based on person type.
- The auto-generated code (VIS-00001, PRV-00001) is handled by a database trigger. The API does not need to generate the code — it is returned after insert.
- The desktop implementation replicates the web feature using the same component patterns but with react-i18next instead of next-intl. All write operations (person registration, access events, vehicles, images) work offline via SQLite + outbox sync with idempotent event IDs.
- Access event editing is limited to guards/admins modifying their own recent events. Full audit-log immutability enforcement is deferred to the logbook module.

## Dependencies

- **Existing residents submodule**: The visitor/provider submodules mirror its architecture (page client, table, sidebar, keyboard navigation, access event form).
- **Existing VehicleForm component**: Will be extended to support visit person vehicle creation.
- **Existing access-events API module**: Will be extended with visit person support.
- **Database migration**: New visit_persons table, visit_person_images table (schema only), and extension of vehicles table with visit_person_id column plus the code auto-generation trigger.
- **Sidebar navigation config**: Must add "visitors" and "providers" sub-items under "visits-and-residents".

## Clarifications

### Session 2026-04-10

- Q: Image capture method by platform? → A: Desktop: live webcam capture (primary) + file upload fallback. Web: file upload only.
- Q: Are images required during registration? → A: All images are optional. The form encourages capture but does not block registration without images.
- Q: Image management after initial registration? → A: View, add new, and replace existing images of the same type (old version overwritten). No standalone delete.
- Q: Who can change visit person status (allowed/flagged/denied)? → A: Any guard, admin, or super_admin can set any status during registration or editing. No role restriction on status values.
- Q: Desktop offline behavior for visitor/provider operations? → A: Full offline support — person registration, access events, vehicle creation, and image capture all cached locally via SQLite + outbox sync.
