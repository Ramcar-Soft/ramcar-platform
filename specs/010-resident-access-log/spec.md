# Feature Specification: Resident Access Log

**Feature Branch**: `010-resident-access-log`  
**Created**: 2026-04-10  
**Status**: Draft  
**Input**: Implement the "Residentes" submodule under visits-and-residents — a guard-facing page for logging resident entry/exit movements with vehicle selection, inline vehicle registration, animated sidebar form, and keyboard shortcuts.

## Clarifications

### Session 2026-04-10

- Q: Should the sidebar show the resident's recent access events as context? → A: Show the last access event (direction + timestamp) at the top of the sidebar form.
- Q: Should admin/super_admin also access the Residents logging page? → A: Yes — guard, admin, and super_admin can all access the page and log events.
- Q: Should the direction field default to a value or require explicit selection? → A: Default to "Entry" — guard can switch to "Exit" if needed.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Log a Resident Entry on Foot (Priority: P1)

A guard at the booth sees a resident approaching on foot. The guard opens the Residents page, finds the resident in the list using the search field, clicks their row, and a right sidebar slides open with the access form. The guard selects "Entry" as direction, "Pedestrian" as mode, and saves. The sidebar closes and a confirmation toast appears.

**Why this priority**: This is the most basic and frequent operation — logging a pedestrian entry. It establishes the core workflow: search → select → fill form → save.

**Independent Test**: Can be fully tested by navigating to the Residents page, searching for a resident, clicking their row, filling direction and mode, and saving. Delivers the core value of recording who enters the community and when.

**Acceptance Scenarios**:

1. **Given** the guard is on the Residents page and residents are listed, **When** the guard clicks a resident row, **Then** a right sidebar slides in from the right with an animated transition showing the access event form pre-filled with the resident's name and their last access event (direction + timestamp) displayed as read-only context at the top.
2. **Given** the sidebar is open with the form, **When** the guard selects "Entry" and "Pedestrian" and clicks Save, **Then** the access event is persisted, the sidebar closes with an animation, and a success toast appears.
3. **Given** the sidebar is open, **When** the guard selects "Exit" and "Pedestrian" and clicks Save, **Then** the access event is persisted with direction "exit" and mode "pedestrian".
4. **Given** the sidebar is open for a resident who has never had an access event, **When** the guard views the form, **Then** no last event context is shown (the area is either hidden or displays "No previous entries").

---

### User Story 2 - Search and Filter the Resident List (Priority: P1)

A guard needs to quickly find a specific resident among potentially hundreds. The guard types part of the resident's name, email, address, or unit number into the search field. The table filters in real time, showing only matching residents.

**Why this priority**: Guards need to locate residents fast during peak traffic. Without effective search, the feature is impractical for communities with many residents.

**Independent Test**: Can be tested by typing partial text into the search field and verifying the table filters correctly across multiple resident attributes (name, email, address, phone).

**Acceptance Scenarios**:

1. **Given** the Residents page is loaded with multiple residents, **When** the guard types a partial name in the search field, **Then** only residents whose information matches the search text are displayed.
2. **Given** the search field has text, **When** the guard clears the search field, **Then** the full resident list is restored.
3. **Given** the search yields no results, **When** the guard looks at the table, **Then** an empty state message is displayed (e.g., "No residents found").

---

### User Story 3 - Log a Resident Entry with Vehicle (Priority: P1)

A resident arrives in their car. The guard selects the resident, chooses "Entry" and "Vehicle" mode. The form shows a list of vehicles registered to that resident. The guard selects the correct vehicle and saves the event.

**Why this priority**: Vehicle entries are equally common as pedestrian entries and are a core part of the access log. The vehicle selection logic is essential for accurate record keeping.

**Independent Test**: Can be tested by selecting a resident who has registered vehicles, choosing "Vehicle" mode, verifying the vehicle dropdown appears with the resident's vehicles, selecting one, and saving.

**Acceptance Scenarios**:

1. **Given** the sidebar form is open for a resident who has multiple registered vehicles, **When** the guard selects "Vehicle" as mode, **Then** a vehicle selection dropdown appears listing all vehicles owned by that resident (showing brand, model, plate, color).
2. **Given** the resident has exactly one registered vehicle, **When** the guard selects "Vehicle" as mode, **Then** that vehicle is automatically selected in the dropdown.
3. **Given** a vehicle is selected, **When** the guard saves, **Then** the access event is persisted with the selected vehicle reference.

---

### User Story 4 - Register a New Vehicle Inline (Priority: P2)

A resident arrives in a new car that is not yet registered. The guard selects the resident, chooses "Vehicle" mode, but finds no vehicles listed (or the right vehicle is missing). The guard clicks an "Add Vehicle" option within the form and fills out the vehicle details (type, brand, model, plate, color, notes). After saving the vehicle, it becomes available for selection in the access event form.

**Why this priority**: New vehicles need to be registered without leaving the current workflow. This avoids forcing the guard to navigate away to a separate vehicle registration page while a resident waits.

**Independent Test**: Can be tested by selecting a resident with no registered vehicles, switching to "Vehicle" mode, using the inline vehicle registration form, saving the vehicle, and then completing the access event.

**Acceptance Scenarios**:

1. **Given** the resident has no registered vehicles and "Vehicle" mode is selected, **When** the guard looks at the form, **Then** a prompt to register a new vehicle is displayed along with the vehicle registration sub-form.
2. **Given** the inline vehicle form is visible, **When** the guard fills in vehicle type, brand, model, plate, and color and saves, **Then** the new vehicle is persisted and associated with the resident, and it becomes the selected vehicle in the access event form.
3. **Given** the resident has existing vehicles but needs to add another, **When** the guard clicks "Add Vehicle" in the vehicle selector, **Then** the inline vehicle registration sub-form appears without losing the current form state.
4. **Given** the vehicle form has validation errors (e.g., missing required vehicle type), **When** the guard attempts to save, **Then** validation messages are shown and the save is prevented.

---

### User Story 5 - Navigate Using Keyboard Shortcuts (Priority: P2)

A guard who processes many entries per shift wants to minimize mouse usage. While the sidebar is closed, the guard presses `B` to focus the search input, types a name, uses arrow keys to highlight a row in the filtered results, and presses `Enter` to open the sidebar for that resident.

**Why this priority**: Keyboard shortcuts significantly speed up the workflow for power users (guards) who repeat this process many times per shift. This is an ergonomic improvement that compounds over time.

**Independent Test**: Can be tested by pressing `B` (verifying search input focuses), typing text, pressing arrow down/up (verifying row highlight moves), and pressing Enter (verifying sidebar opens for the highlighted row).

**Acceptance Scenarios**:

1. **Given** the sidebar is closed and no input field is focused, **When** the guard presses `B`, **Then** the search input gains focus.
2. **Given** the search input is focused and the table shows filtered results, **When** the guard presses the down arrow key, **Then** the first (or next) row in the table is highlighted visually.
3. **Given** a row is highlighted via arrow keys, **When** the guard presses `Enter`, **Then** the sidebar opens for that highlighted resident (same as clicking the row).
4. **Given** the sidebar is open (form is displayed), **When** the guard presses `B`, **Then** nothing happens (keyboard shortcuts are disabled while the sidebar is open to avoid conflicts with form input).
5. **Given** the first row is highlighted, **When** the guard presses the up arrow key, **Then** the highlight stays on the first row (does not wrap or disappear).

---

### User Story 6 - Sidebar Animation and Close Behavior (Priority: P3)

When a guard selects a resident, the right sidebar smoothly slides in from the right edge. After saving or clicking a close button, the sidebar slides back out. This provides visual feedback that the context has changed.

**Why this priority**: Animation improves usability by providing spatial context for where the form is appearing and disappearing, reducing cognitive load. However, the feature works without animation, making this a polish item.

**Independent Test**: Can be tested by clicking a resident row and observing the sidebar slide-in animation, then saving or closing and observing the slide-out animation.

**Acceptance Scenarios**:

1. **Given** no sidebar is visible, **When** the guard clicks a resident row, **Then** the right sidebar slides in from the right edge with a smooth transition.
2. **Given** the sidebar is open, **When** the guard saves the form successfully, **Then** the sidebar slides out to the right and a success toast appears.
3. **Given** the sidebar is open, **When** the guard clicks a close/cancel button or presses Escape, **Then** the sidebar slides out without saving.
4. **Given** the sidebar is open for resident A, **When** the guard clicks resident B's row in the table (still partially visible), **Then** the sidebar content transitions to show resident B's information.

---

### Edge Cases

- What happens when a resident has been deactivated (status = inactive)? Inactive residents should still appear in the list but be visually distinguished (e.g., dimmed row) and selectable. Guards may still need to log exits for inactive residents.
- What happens if the network fails during save? The system displays an error toast with a "Retry" option. The form data is preserved in the sidebar so the guard does not need to re-enter it.
- What happens if two guards try to log an event for the same resident at the same time? Both events are saved independently — access events are append-only logs, so concurrent writes do not conflict.
- What happens when the resident list is empty (no residents in the tenant)? An empty state is displayed with a message like "No residents registered in this community."
- What happens if the guard selects "Vehicle" mode but then switches back to "Pedestrian"? The vehicle selection is cleared and the vehicle field is hidden. No vehicle is saved with the access event.
- What happens if the guard closes the sidebar without saving? No data is persisted. If the guard had partially filled the form, the data is lost (the form is short enough that this is acceptable).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a list of all users with role "resident" belonging to the guard's tenant on the Residents page.
- **FR-002**: System MUST provide a free-text search field that filters residents by any visible attribute (name, email, phone, address, unit number).
- **FR-003**: System MUST open a right sidebar form when a guard clicks a resident row or presses Enter on a highlighted row.
- **FR-004**: The sidebar MUST animate into view from the right edge of the screen on open and slide back out on close.
- **FR-005**: The access event form MUST include: direction (entry/exit), access mode (vehicle/pedestrian), and vehicle selection (when mode is "vehicle").
- **FR-006**: When "vehicle" mode is selected and the resident has exactly one vehicle, the system MUST auto-select that vehicle.
- **FR-007**: When "vehicle" mode is selected and the resident has multiple vehicles, the system MUST display a selection list showing brand, model, plate, and color for each vehicle.
- **FR-008**: When "vehicle" mode is selected and the resident has no registered vehicles, the system MUST display an inline vehicle registration form.
- **FR-009**: The inline vehicle registration form MUST be a reusable component that captures: vehicle type (from predefined list), brand, model, plate, color, and notes.
- **FR-010**: The reusable vehicle registration component MUST be designed for reuse in the user registration/edit page for associating vehicles with resident users.
- **FR-011**: After a successful save, the sidebar MUST close automatically and a success toast MUST appear.
- **FR-012**: The keyboard shortcut `B` MUST focus the search input when the sidebar is closed and no other input is focused.
- **FR-013**: While the search input is focused and the table shows results, arrow up/down keys MUST highlight rows in the table sequentially.
- **FR-014**: When a table row is highlighted (via keyboard), pressing `Enter` MUST open the sidebar for that resident.
- **FR-015**: All keyboard shortcuts MUST be disabled when the sidebar is open to prevent conflicts with form inputs.
- **FR-016**: The Residents submenu item MUST appear under the "Visits & Residents" sidebar group and be accessible to users with roles "guard", "admin", and "super_admin".
- **FR-017**: The page MUST support internationalization (Spanish and English) for all labels, placeholders, and messages.
- **FR-018**: The access event MUST record: the resident identity, direction, access mode, vehicle (if applicable), the guard who logged it, and the timestamp.
- **FR-019**: The page MUST be available on both web and desktop platforms following each platform's existing patterns.
- **FR-020**: Pressing Escape while the sidebar is open MUST close the sidebar without saving.
- **FR-021**: When the sidebar opens for a resident, the system MUST display that resident's last access event (direction and timestamp) as read-only context at the top of the form. If no prior events exist, this area is hidden or shows "No previous entries."
- **FR-022**: The direction field MUST default to "Entry" when the sidebar opens. The guard can switch to "Exit" manually.

### Key Entities

- **Resident**: A user with role "resident" belonging to a tenant. Attributes: name, email, phone, address, unit number, status. Has zero or more vehicles.
- **Vehicle**: A vehicle registered to a resident. Attributes: vehicle type, brand, model, plate, color, notes. Belongs to exactly one resident (in this context).
- **Access Event**: A log entry recording a resident's entry or exit through the community gate. Attributes: direction (entry/exit), access mode (vehicle/pedestrian), vehicle reference (optional), recording guard, timestamp, source platform. Append-only (never updated or deleted).

### Data Access Architecture

| Operation               | API Endpoint                      | HTTP Method | Request DTO                    | Response DTO                 |
|-------------------------|-----------------------------------|-------------|--------------------------------|------------------------------|
| List residents          | GET /api/residents                | GET         | ResidentFiltersDto             | PaginatedResponse<Resident>  |
| Get resident vehicles   | GET /api/residents/:id/vehicles   | GET         | -                              | Vehicle[]                    |
| Create vehicle          | POST /api/vehicles                | POST        | CreateVehicleDto               | Vehicle                      |
| Get last access event   | GET /api/access-events/last/:userId | GET      | -                              | AccessEvent | null           |
| Create access event     | POST /api/access-events           | POST        | CreateAccessEventDto           | AccessEvent                  |

**Frontend data flow**: TanStack Query -> NestJS API -> Repository -> Supabase/Postgres  
**Allowed frontend Supabase usage**: Auth (`supabase.auth.*`) and Realtime (`supabase.channel()`) only

## Assumptions

- The `vehicles` and `access_events` database tables will be created as part of this feature's migration, following the schema defined in the project's database design document.
- Resident list pagination follows the same pattern as the existing users list (page/pageSize with server-side filtering).
- The guard's tenant is automatically determined from their JWT token — no tenant selector is needed on this page.
- The vehicle registration inline form uses the same vehicle type catalog defined in the database schema: car, motorcycle, pickup_truck, truck, bicycle, scooter, other.
- Toast notifications use the existing toast system already available in the shared UI package.
- The desktop version follows the same user experience but uses the desktop's IPC-based data access pattern instead of direct HTTP calls.
- Access events are append-only; there is no edit or delete functionality for logged events.
- The "Residents" submenu is accessible to guard, admin, and super_admin roles. All three can log access events. The future logbook (bitácora) view will also be accessible to all three roles — guards get read-only access to query recent entries but cannot export data.
- Vehicle type labels are mapped to localized strings in the frontend (i18n), not stored as localized text in the database.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A guard can complete the full resident access logging workflow (search -> select -> fill form -> save) in under 30 seconds for a pedestrian entry.
- **SC-002**: A guard using keyboard shortcuts can complete the same workflow in under 20 seconds without touching the mouse.
- **SC-003**: Search results update within 500ms of the guard typing, allowing fast lookup even in communities with 500+ residents.
- **SC-004**: 100% of access events include the required fields: resident identity, direction, access mode, recording guard, and timestamp.
- **SC-005**: The inline vehicle registration flow allows a guard to register a new vehicle and log the entry in under 60 seconds without navigating away from the page.
- **SC-006**: The feature works on both web and desktop platforms with consistent behavior and appearance.
