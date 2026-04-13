# Feature Specification: Edit Visitor/Service Provider Records & Read-Only Access Events

**Feature Branch**: `012-visit-person-edit`
**Created**: 2026-04-13
**Status**: Draft
**Input**: User description: "Review the implementation of specs/011-visitor-provider-access. There was a misunderstanding of the edit feature. Edit should NOT live in the same form used to register a new visitor/service-provider visit. In the Visitantes and Proveedores tables, add a column at the end containing an edit button that opens a right sidebar with a new form to edit the already-created Visitor or Service Provider. The current behavior of clicking a table row to open the form for recording a new visit must be preserved. Access event entries (for residents, visitors, and service providers) are not editable — they are read-only."

## Context

Feature `011-visitor-provider-access` implemented an "edit" affordance inside the access-event form displayed in the Visitor/Provider sidebar (via a pencil icon on past events in the recent-events list). This conflated two distinct concepts:

1. **Editing the person record** (name, status, resident being visited, phone, company, notes, images) — a data-correction workflow that happens rarely.
2. **Logging a new access event** — the high-frequency gate-throughput workflow.

The correct design is: access events are immutable audit records and the "edit" action must apply to the person record only, reached via a dedicated edit button in the table.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Edit an Existing Visitor Record (Priority: P1)

An admin or guard notices that a previously registered visitor has incorrect information (misspelled name, wrong status, wrong resident visited, outdated notes). They go to the Visitantes table, click the edit button on the visitor's row, and correct the record in a sidebar form — without starting a new access event.

**Why this priority**: Data integrity is essential. Without a dedicated edit path, incorrect visitor records accumulate and degrade the usefulness of the gate log over time. The current implementation has no way to fix a misspelled name except by creating a duplicate record.

**Independent Test**: Can be fully tested by creating a visitor with a misspelled name, navigating to the Visitantes page, clicking the edit button in the row's actions column, changing the name in the form that appears, saving, and verifying the row reflects the new name without creating a new access event.

**Acceptance Scenarios**:

1. **Given** the Visitantes table is displayed, **When** the guard looks at any row, **Then** the last column shows an edit action (icon button) clearly distinct from the row click affordance.
2. **Given** the guard clicks the edit button on a visitor row, **When** the action fires, **Then** a right sidebar slides in titled "Edit Visitor" showing a form pre-populated with the visitor's current fields (full name, status, resident visited, notes).
3. **Given** the edit sidebar is open for an existing visitor, **When** the guard changes one or more fields and clicks save, **Then** the visitor record is updated, the sidebar closes, a confirmation toast appears, and the table row immediately reflects the new values.
4. **Given** the edit sidebar is open, **When** the guard clicks cancel or closes the sidebar, **Then** the visitor record is unchanged and no new access event is created.
5. **Given** the guard clicks the edit button on a row, **When** the sidebar opens, **Then** no access-event form is visible — only the person-record form.
6. **Given** the guard is editing a visitor, **When** the save succeeds, **Then** no access event of any kind is recorded for this action.

---

### User Story 2 - Edit an Existing Service Provider Record (Priority: P1)

Same flow as Story 1, applied to the Proveedores table. The form surfaces provider-specific fields (company, phone) in addition to the fields common to visitors.

**Why this priority**: Providers change companies, phone numbers, and status more often than visitors (delivery drivers rotate, companies rebrand). Editing is proportionally more valuable here.

**Independent Test**: Can be fully tested by creating a service provider with a placeholder company, clicking the edit button in the Proveedores table, updating the company field, saving, and verifying the updated value.

**Acceptance Scenarios**:

1. **Given** the Proveedores table is displayed, **When** the guard clicks the edit button on a provider row, **Then** a right sidebar slides in titled "Edit Service Provider" with a form pre-populated with full name, phone, company, status, resident visited (optional), and notes.
2. **Given** the edit sidebar is open for a provider, **When** the guard changes company or phone and saves, **Then** the provider record is updated, the sidebar closes, and the row reflects the new values.
3. **Given** the guard is editing a provider, **When** they cancel, **Then** no changes are persisted and no access event is created.

---

### User Story 3 - Preserve Current New-Visit Workflow on Row Click (Priority: P1)

The core daily workflow — click a table row to log a new access event for an existing visitor/provider — must continue to work exactly as it does today. Adding the edit column must not disrupt this behavior.

**Why this priority**: This is the high-frequency workflow that drives gate throughput. Any regression here directly impacts daily operations. The edit feature must be a pure addition, not a replacement.

**Independent Test**: Can be fully tested by clicking a visitor or provider row (anywhere except the edit button) and verifying that the sidebar opens in "log new access event" mode exactly as before.

**Acceptance Scenarios**:

1. **Given** the Visitantes or Proveedores table is displayed, **When** the guard clicks anywhere on a row except the edit button, **Then** the sidebar opens in the existing view/log mode showing person info, recent events (read-only), vehicle selection, and the access event form.
2. **Given** the guard clicks the edit button on a row, **When** the click event fires, **Then** the click does NOT propagate to the row click handler (i.e., only the edit sidebar opens, not the new-visit sidebar).
3. **Given** the user story 6 keyboard navigation from spec 011 (B / arrows / Enter), **When** the guard presses Enter on a highlighted row, **Then** the sidebar still opens in the new-visit mode (keyboard path targets the row action, not the edit action).
4. **Given** the existing "Register New" action on the Visitantes or Proveedores page, **When** the guard clicks it, **Then** the sidebar opens in the current create mode, unchanged.

---

### User Story 4 - Access Events Are Read-Only Everywhere (Priority: P1)

All access-event entries (for residents, visitors, and service providers, on web and desktop) must be displayed as read-only historical records. No UI affordance should allow editing, deleting, or otherwise mutating a previously created access event.

**Why this priority**: Access events are the gate activity audit log. Allowing edits undermines the trustworthiness of the log. Current implementation exposes an edit action on past events inside the visit-person sidebar's recent-events list, which must be removed.

**Independent Test**: Can be fully tested by opening the visitor/provider sidebar for a person with recent events and verifying no edit/delete controls appear on any past event, and by opening the resident sidebar and verifying the same.

**Acceptance Scenarios**:

1. **Given** the visitor or provider sidebar is open in view mode showing recent access events, **When** the guard inspects the list, **Then** no edit button, delete button, or any other mutation affordance is present on any event row.
2. **Given** the resident sidebar is open, **When** the guard inspects the recent events, **Then** the same read-only rule applies — no edit or delete affordances.
3. **Given** the platform is desktop (Electron booth), **When** the guard views any list of past access events, **Then** they are read-only — identical rule to web.
4. **Given** a user attempts to call the update-access-event operation by any means, **When** the request reaches the system, **Then** the operation is unavailable (the corresponding hooks, endpoints, and UI controls have been removed from the feature surface).

---

### User Story 5 - Edit Visitor/Provider Images from the Edit Sidebar (Priority: P2)

When editing a visitor or provider record, the guard can also manage that person's images (view existing, add new types, replace existing of the same type) — because images are part of the person record, not the access event.

**Why this priority**: Images were introduced in spec 011 as part of the person record. The new edit sidebar is the natural place to manage them; without this, the only way to add/replace images remains the new-visit sidebar, which mixes concerns again.

**Independent Test**: Can be fully tested by opening the edit sidebar for a visitor, uploading a new face image, saving, and verifying the image appears in the person's image set and persists after reloading.

**Acceptance Scenarios**:

1. **Given** the edit sidebar is open for a visitor or provider, **When** the guard scrolls, **Then** an image-management section is shown with the same capture/upload behavior as the new-visit sidebar (web: upload only; desktop: webcam + upload fallback).
2. **Given** the guard uploads a new image of a type already present, **When** the upload completes, **Then** the prior image of that type is replaced (consistent with spec 011 FR-025).
3. **Given** the guard closes the edit sidebar mid-edit after uploading an image but without saving the form fields, **When** the sidebar closes, **Then** the uploaded image persists (image persistence is independent of the form save), but text-field changes are discarded — the guard is warned of unsaved text-field changes if any exist.

---

### Edge Cases

- **What happens when the same guard has both edit sidebar and new-visit sidebar state in mind?** Only one sidebar instance is visible at a time. Opening one closes the other implicitly (there is a single Sheet component).
- **What happens when the guard edits a visitor's "resident visited" to a resident that no longer exists?** The resident selector shows only current (non-deleted) residents. If the previous resident has been deleted, the field renders empty and the guard must re-select.
- **What happens if another user updates the same visitor concurrently?** Last-write-wins is acceptable for this feature; optimistic-locking conflict detection is deferred.
- **What happens to any in-flight draft of the new-visit form when the guard opens the edit sidebar for a different person?** The draft persistence is scoped by form identity (the existing form-persistence hook), so the new-visit draft is preserved and restored next time that sidebar opens.
- **What happens on desktop offline mode when the guard edits a visitor?** The edit operation is queued via the existing outbox pattern (same mechanism as spec 011 FR-026) and synchronized when connectivity returns.
- **What happens if the guard has no permission to edit?** The edit button is hidden for roles without edit permission (see FR-009).
- **What happens when the recent-events list previously had an edit handler consumed by a parent?** All such handlers, hooks, and endpoints are removed — including in the resident sidebar — to enforce the read-only rule uniformly.

## Requirements *(mandatory)*

### Functional Requirements

#### Edit Visitor/Provider Records

- **FR-001**: The Visitantes table and the Proveedores table MUST each display a trailing actions column containing an edit button (icon-only, with accessible label "Edit visitor" / "Edit service provider") on every row.
- **FR-002**: The edit button MUST stop click propagation so the row's click handler does not also fire when the edit button is activated.
- **FR-003**: Clicking the edit button MUST open a right-side sidebar in a new "edit" mode, distinct from the existing "view" (log new event) and "create" (register new person) modes.
- **FR-004**: The edit sidebar MUST display a form pre-populated with the current values of the selected person: full name, status, resident visited, and notes; additionally, phone and company fields for service providers.
- **FR-005**: The edit sidebar MUST NOT display an access-event form, a vehicle selector for logging a new event, or any other affordance that would create a new access event.
- **FR-006**: Saving the edit form MUST update the visit person record only. It MUST NOT create a new access event.
- **FR-007**: After a successful save, the edit sidebar MUST close automatically, a confirmation toast MUST appear, and the underlying table row MUST reflect the updated values without a full page reload.
- **FR-008**: Canceling the edit form (cancel button, Escape key, or clicking outside the sheet) MUST discard any unsaved text-field changes and leave the visit person record unchanged. If unsaved changes exist, the guard MUST be warned before the sidebar closes.
- **FR-009**: The edit button MUST be visible only to users with roles: `super_admin`, `admin`, and `guard` (same as the rest of the visitors/providers submodule). Residents MUST NOT see the edit button.
- **FR-010**: The edit sidebar MUST include an image-management section allowing the guard to view existing images, add new images of types not yet captured, and replace an existing image of the same type — consistent with spec 011 FR-023, FR-024, and FR-025. No standalone image deletion.
- **FR-011**: The edit feature MUST work on both web and desktop platforms with identical UX. On desktop, edit operations MUST work offline and sync via the existing outbox pattern.

#### Preserve New-Visit Workflow

- **FR-012**: Clicking a table row (anywhere except the edit button) MUST continue to open the sidebar in the existing view/log-new-access-event mode, preserving all behavior defined in spec 011 (access event form, vehicle selector, inline vehicle registration, recent events display, image viewing).
- **FR-013**: The existing "Register New" action on the Visitantes and Proveedores pages MUST remain unchanged — it opens the sidebar in create mode.
- **FR-014**: Keyboard navigation (spec 011 FR-013) MUST remain targeted at the row action (new-visit). Pressing Enter on a highlighted row MUST NOT trigger edit mode. An optional dedicated keyboard shortcut for edit is NOT included in this feature.

#### Access Events Are Read-Only

- **FR-015**: The recent-events list shown in the Visitor, Provider, and Resident sidebars MUST NOT render any edit, delete, or other mutation controls on individual event rows. Events are displayed purely as historical records.
- **FR-016**: The existing access-event update operation exposed by the current implementation (hook, API endpoint, controller route, service method, use-case) MUST be removed from all feature surfaces — web, desktop, and API — as no UI path should be able to reach it. No client-facing operation SHOULD exist that allows modifying an access event after creation.
- **FR-017**: The read-only rule MUST apply equally to residents, visitors, and service providers, across web and desktop.
- **FR-018**: Any existing form-persistence drafts tied to the removed access-event edit flow MUST be cleaned up to avoid stale state leaking into the new-visit flow.

### Key Entities *(include if feature involves data)*

This feature introduces no new entities. It touches the following existing entities:

- **Visit Person** (from spec 011): The target of the new edit flow. Mutable fields editable via the new sidebar: `full_name`, `status`, `resident_id` (visited resident), `phone`, `company`, `notes`. Immutable identity fields: `id`, `code`, `type`, `tenant_id`, `created_at`.
- **Visit Person Image** (from spec 011): Images are managed from the edit sidebar in addition to the existing entry points. Behavior is unchanged (add new types, replace same type, no delete).
- **Access Event** (from spec 010/011): Becomes fully immutable from the UI perspective. No fields may be modified after creation.

### Data Access Architecture *(mandatory for features involving data)*

| Operation                              | API Endpoint                             | HTTP Method | Request DTO           | Response DTO      |
|----------------------------------------|------------------------------------------|-------------|-----------------------|-------------------|
| Get visit person by ID (prefill form)  | GET /api/visit-persons/:id               | GET         | -                     | VisitPerson       |
| Update visit person                    | PATCH /api/visit-persons/:id             | PATCH       | UpdateVisitPersonDto  | VisitPerson       |
| Upload visit person image (edit path)  | POST /api/visit-persons/:id/images       | POST        | Multipart(file, type) | VisitPersonImage  |
| List visit person images (edit path)   | GET /api/visit-persons/:id/images        | GET         | -                     | VisitPersonImage[]|

**Operations removed by this feature** (must no longer be reachable from any client):

| Removed Operation             | Previously-used Endpoint            |
|-------------------------------|-------------------------------------|
| Update access event           | PATCH /api/access-events/:id        |

**Frontend data flow**: TanStack Query → NestJS API → Repository → Supabase/Postgres
**Allowed frontend Supabase usage**: Auth (`supabase.auth.*`) and Realtime (`supabase.channel()`) only

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A guard can correct a misspelled visitor or provider name in under 15 seconds from the moment they identify the error (table → edit → type → save).
- **SC-002**: 100% of previously created access events are shown without any mutation affordance in every list surface (visitor, provider, resident sidebars, on both web and desktop).
- **SC-003**: 0 new access events are created as a side effect of editing a visit person record (measured across acceptance tests for User Stories 1 and 2).
- **SC-004**: Row-click behavior on the Visitantes and Proveedores tables is unchanged versus spec 011 — measured by the existing spec 011 acceptance tests for User Stories 1–4 all continuing to pass without modification to their scenarios.
- **SC-005**: The edit sidebar opens within 500 ms of the guard clicking the edit button (pre-population does not block the sidebar animation).
- **SC-006**: Edit operations succeed offline on desktop 100% of the time and sync successfully when connectivity returns, matching the reliability of other offline write paths from spec 011.

## Assumptions

- The tenant isolation, RBAC, and RLS rules established in spec 011 continue to apply to the edit operation with no changes to guard/admin/super_admin permissions.
- The existing `UpdateVisitPersonDto` (or its equivalent) introduced in spec 011 is sufficient to express all editable fields; if any field is missing the spec 011 DTO, it will be added during planning rather than being treated as a new entity.
- Form persistence for the edit sidebar uses a dedicated draft key (e.g., `visit-person-edit-<id>`) so drafts do not collide with the create draft (`visit-person-create`) or with other persons' edit drafts.
- "Warning before discarding unsaved changes" uses a lightweight inline confirmation (e.g., dialog or toast), not a full modal — consistent with other destructive-warning patterns in the codebase.
- Removing the access-event update path includes removing the NestJS route, service method, use case, repository method (if dedicated), the shared Zod DTO, the web/desktop hooks (`useUpdateAccessEvent`), and any translations or buttons referring to "edit event". Deleting the underlying DB column or adding an `updated_at` trigger for events is out of scope.
- No database migrations are required: the existing `visit_persons`, `visit_person_images`, and `access_events` tables are already shaped to support this feature.

## Dependencies

- **Spec 011 (Visitor & Service Provider Access Logging)**: This feature directly amends the behavior delivered by spec 011. It cannot be implemented without 011 already in place.
- **Spec 010 (Resident Access Log)**: The read-only access-event rule (User Story 4, FR-015–FR-017) applies to the resident sidebar as well. Any edit UI introduced there must be removed.
- **Existing residents submodule**: Shares the "access events are read-only" rule.
- **Existing form persistence hook** (`useFormPersistence`): Reused for the edit sidebar with a new scoped key.
- **Sidebar navigation config**: No changes — the feature lives on existing Visitantes and Proveedores pages.
