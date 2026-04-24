# Feature Specification: Active Tenant Scoping from the Top-Bar Selector

**Feature Branch**: `021-tenant-selector-scope`
**Created**: 2026-04-24
**Status**: Draft
**Input**: User description: "change the behavior of the tenant selector component placed in the top bar, currently it changes a context value, but it actually doesn't filter or do anything. When a tenant is selected: (1) guard role: it should filter the tenant information, meaning that it should be able to capture information only for the selected tenant, should be able to see only residents for that tenant, it should save access events for the selected tenant. (2) admin or super admin roles: same behavior for the module of access events as the guard role; for the list views like catalogs or access log, it should serve as a filter - if a tenant is selected it should display only information of the selected tenant. In the Bitacora module there is an existing tenant dropdown; in this particular view the selected tenant from the top bar should serve as the default selected, not filter always the info of that particular table. Add a confirmation dialog when switching tenants."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Guard captures access events for the correct tenant only (Priority: P1)

A guard working at a booth that serves one residential community opens the app. The tenant they are working for is pre-selected in the top bar. Every resident lookup, visitor/provider search, and access event they create is attached to that tenant automatically. If the guard is ever cross-staffed across sites, they can change the active tenant from the top bar and all subsequent captures (residents search, visit creation, entry/exit events) flow to the newly selected tenant — never to the previous one.

**Why this priority**: This is the core data-integrity promise of a multi-tenant security platform. Guards are the primary data-capture surface, and a wrong-tenant access event is effectively a missing event for the right tenant and a false event for the wrong one. Without this, the product cannot be trusted operationally.

**Independent Test**: With one user account that has access to two tenants, sign in on the booth app, confirm the active tenant is Tenant A, capture an entry; switch the top bar to Tenant B, confirm the switch, capture an entry; verify each entry is stored against the correct tenant and that the resident list was scoped to the active tenant at capture time.

**Acceptance Scenarios**:

1. **Given** a guard is signed in with Tenant A active in the top bar, **When** they search the residents list during visit creation, **Then** only residents belonging to Tenant A appear.
2. **Given** a guard is signed in with Tenant A active in the top bar, **When** they record an access event (entry or exit), **Then** the event is stored against Tenant A.
3. **Given** a guard is signed in with Tenant A active in the top bar, **When** they change the top-bar selector to Tenant B and confirm, **Then** subsequent resident searches and access-event captures are scoped to Tenant B.
4. **Given** a guard is signed in and the access log view is visible, **When** they view the access log, **Then** only events belonging to the currently active tenant are shown.

---

### User Story 2 - Admin and Super Admin filter catalogs and access log by active tenant (Priority: P2)

An admin (or super admin) manages multiple residential communities. When they pick a tenant in the top bar, the admin portal views (users catalog, residents catalog, visitors catalog, providers catalog, access log, patrols, blacklist, dashboard metrics) show only records for that tenant. Picking a different tenant refreshes every list to that tenant's data. Access-event capture, when an admin performs it, attaches to the active tenant — same rule as for guards.

**Why this priority**: Admins and super admins own the data quality for their communities. Without scoping, lists of residents, visitors, users and events from multiple communities blur together, making day-to-day triage impossible and creating a realistic risk of an admin performing an operation (edit, delete, invite) against the wrong community. High priority once guard capture (P1) is in place.

**Independent Test**: Sign in as an admin with two authorized tenants; open the users catalog, residents catalog, and access log with Tenant A active; record the visible row counts and representative entries; switch the top bar to Tenant B with confirmation; verify each list now shows Tenant B's records and no Tenant A records are visible.

**Acceptance Scenarios**:

1. **Given** an admin is signed in with Tenant A active, **When** they open the users catalog, **Then** only users who belong to Tenant A (or are linked to Tenant A) are listed.
2. **Given** an admin is signed in with Tenant A active, **When** they open the residents catalog, the visitors catalog, or the providers catalog, **Then** each list shows only entries that belong to Tenant A.
3. **Given** an admin is signed in with Tenant A active, **When** they open the access log, **Then** only access events for Tenant A are shown.
4. **Given** an admin is signed in with Tenant A active and creates a new resident, visitor, or access event, **When** the record is saved, **Then** the record is attached to Tenant A.
5. **Given** a super admin is signed in, **When** they open the top-bar selector, **Then** every tenant they are authorized for appears as a selectable option.

---

### User Story 3 - Bitacora (Logbook) uses the top-bar tenant as a default only (Priority: P2)

The Bitacora (Logbook) module already exposes an in-page tenant dropdown because its reports are commonly consulted across tenants. When a user opens Bitacora, the in-page dropdown is pre-filled with whatever tenant is active in the top bar. The user can then change the in-page dropdown to look at a different tenant's logbook without disturbing the top-bar selection. The top bar is the default seed; the in-page dropdown is the authoritative filter for that view.

**Why this priority**: Bitacora is an existing exception to the global scoping rule. Breaking it — by forcing the top bar to overwrite or by ignoring the top bar entirely — would surprise existing users. Important but not blocking for the core data-integrity promise.

**Independent Test**: Sign in as an admin with Tenant A active; open Bitacora and confirm the in-page dropdown shows Tenant A; change the in-page dropdown to Tenant B and verify the Bitacora table reloads with Tenant B's entries while the top bar still shows Tenant A; navigate away from Bitacora and back — the in-page dropdown resets to the current top-bar tenant.

**Acceptance Scenarios**:

1. **Given** the top bar has Tenant A active, **When** the user opens Bitacora, **Then** the in-page tenant dropdown is pre-selected to Tenant A and the table shows Tenant A entries.
2. **Given** Bitacora is open with Tenant A in both the top bar and the in-page dropdown, **When** the user changes the in-page dropdown to Tenant B, **Then** the Bitacora table reloads to Tenant B while the top bar still shows Tenant A.
3. **Given** Bitacora is open and the in-page dropdown has been set to Tenant B while the top bar shows Tenant A, **When** the user navigates away from Bitacora and returns, **Then** the in-page dropdown is reset to the current top-bar tenant.
4. **Given** the user changes the top-bar tenant (with confirmation) while Bitacora is open, **When** the switch completes, **Then** Bitacora's in-page dropdown reflects the new top-bar selection and the Bitacora table reloads accordingly.

---

### User Story 4 - Confirmation dialog prevents accidental tenant switches (Priority: P2)

Any change to the active tenant in the top bar opens a confirmation dialog that clearly names the tenant the user is switching to and explains that subsequent actions (captures, edits, searches) will target that tenant. The user must explicitly confirm. If they cancel, the selector reverts to the previous tenant and nothing else changes.

**Why this priority**: A mis-click on the top bar could silently re-scope a guard's capture or an admin's edit flow to the wrong community. A one-click confirm is cheap and eliminates an entire class of operational incidents.

**Independent Test**: With two authorized tenants, click the top-bar selector and pick a different tenant; verify the confirmation dialog names source and target tenants; press Cancel and verify the top bar still shows the original tenant and the scoped views did not reload; repeat and press Confirm; verify the switch applies and the previously active tenant is no longer in effect.

**Acceptance Scenarios**:

1. **Given** Tenant A is active, **When** the user picks Tenant B in the top bar, **Then** a confirmation dialog appears naming Tenant A as the source and Tenant B as the target.
2. **Given** the confirmation dialog is open, **When** the user presses Cancel, **Then** Tenant A remains active and no data reloads.
3. **Given** the confirmation dialog is open, **When** the user presses Confirm, **Then** Tenant B becomes active, all currently visible list/catalog views refresh, and any subsequent writes target Tenant B.
4. **Given** the user has unsaved changes in an open form, **When** they trigger a tenant switch, **Then** the confirmation dialog additionally warns that unsaved work will be discarded.

---

### Edge Cases

- **Single-tenant user**: A user authorized for exactly one tenant sees that tenant as the active, fixed selection in the top bar; switching controls are not offered. No confirmation dialog ever fires.
- **Super admin with many tenants**: The selector remains usable with a high number of tenants (search/filter within the selector is expected behavior, consistent with the existing selector component).
- **Tenant membership revoked mid-session**: If the active tenant is no longer in the user's authorized list (for example, their membership was removed or suspended), the system transparently falls back to the first remaining authorized tenant, notifies the user, and clears any in-flight data that would have targeted the revoked tenant.
- **User with no authorized tenants**: The user is not allowed to capture events, view catalogs, or open tenant-scoped views; the app routes them to an appropriate no-access state rather than showing an empty list that looks like a bug.
- **Deep links and bookmarks that carry tenant identifiers in the URL**: The active tenant in the top bar remains the source of truth; links that disagree either respect the active tenant (preferred) or prompt the user to switch before loading the linked content.
- **Offline desktop booth writes**: Queued writes carry the tenant that was active at the moment of capture, not the tenant active at the moment of eventual sync — switching tenants never retroactively re-tags previously captured events.
- **Tenant switch while a list is fetching**: In-flight reads for the old tenant are discarded; the UI does not briefly show old-tenant data after the switch has been confirmed.
- **Bitacora in-page dropdown set to Tenant B, then user navigates to another module**: Other modules respect the top-bar tenant, not the Bitacora dropdown. Bitacora's divergence is local to Bitacora only.
- **Cross-device consistency (web portal and booth desktop)**: Each device tracks its own active tenant; a user signed in on both a browser and a booth workstation may have different active tenants on each.

## Requirements *(mandatory)*

### Functional Requirements

#### Scope of the active tenant

- **FR-001**: The top-bar tenant selector MUST expose every tenant the signed-in user is authorized for, and nothing else.
- **FR-002**: The system MUST persist the active-tenant selection across page reloads, app restarts, and navigation within the session, per device.
- **FR-003**: On first sign-in (no persisted selection), the system MUST pre-select a sensible default — the user's only tenant if they have exactly one, or the user's most recently used tenant if known, or the first tenant in their authorized list otherwise.
- **FR-004**: Users with exactly one authorized tenant MUST see that tenant as the fixed active scope with no switching affordance.

#### Read-side filtering (lists, catalogs, details)

- **FR-005**: All list and catalog views in the admin portal (users, residents, visitors, providers, access log, patrols, blacklist, dashboard metrics) MUST return only records scoped to the active tenant.
- **FR-006**: All list/lookup views in the guard-booth app (residents search during visit creation, visitor/provider search, recent access events) MUST return only records scoped to the active tenant.
- **FR-007**: Detail views reached from a scoped list MUST only be accessible if the underlying record belongs to the active tenant; otherwise the system MUST deny access gracefully and not expose record details.

#### Write-side scoping (captures, creates, edits)

- **FR-008**: Access-event creation (entry, exit) from any role MUST attach the active tenant to the recorded event.
- **FR-009**: Resident, visitor, provider, and vehicle record creation or edits MUST be scoped to the active tenant at the moment of the write.
- **FR-010**: Outbox-backed writes on the desktop app MUST carry the tenant that was active at capture time and MUST NOT be re-tagged when the active tenant changes before sync.

#### Bitacora (Logbook) exception

- **FR-011**: The Bitacora module MUST seed its in-page tenant dropdown from the top-bar active tenant on each entry to the module.
- **FR-012**: The Bitacora in-page dropdown MUST be the authoritative filter for the Bitacora table while the user is on that view.
- **FR-013**: Changing the Bitacora in-page dropdown MUST NOT change the top-bar active tenant and MUST NOT affect any other module.
- **FR-014**: Returning to Bitacora after navigating away MUST re-seed the in-page dropdown from the current top-bar active tenant (no hidden persistence of previous Bitacora-only choices across module navigations).

#### Switching tenants

- **FR-015**: Any change to the top-bar active tenant MUST require explicit user confirmation via a dialog before taking effect.
- **FR-016**: The confirmation dialog MUST identify the current tenant and the target tenant by a human-readable name, and MUST explain in plain language that subsequent actions will target the new tenant.
- **FR-017**: Canceling the confirmation MUST leave the previously active tenant in effect, MUST NOT reload any data, and MUST NOT produce any visible flicker of other-tenant content.
- **FR-018**: Confirming the switch MUST refresh every currently open scoped view so no stale other-tenant data remains visible.
- **FR-019**: If the user has unsaved changes in an open form at the moment of a switch attempt, the confirmation dialog MUST additionally warn that the unsaved work will be discarded.
- **FR-020**: After a confirmed switch, the Bitacora in-page dropdown (if Bitacora is the active view) MUST reflect the new top-bar tenant, consistent with FR-011.

#### Role-specific behavior

- **FR-021**: The Guard role MUST have its read and write scope strictly governed by the active tenant. No guard-role view may display, accept, or write cross-tenant data.
- **FR-022**: The Admin role MUST have its catalog and access-log reads scoped to the active tenant and its writes (including access-event capture) scoped to the active tenant.
- **FR-023**: The SuperAdmin role MUST behave identically to Admin for read/write scoping, with the only difference being that their top-bar selector exposes all tenants in the system.
- **FR-024**: The Resident role (if consuming the portal) MUST continue to see only their own records; the top-bar selector behavior does not alter resident-owned data visibility.

#### Robustness

- **FR-025**: If the active tenant becomes invalid mid-session (membership revoked, tenant suspended), the system MUST recover by selecting another valid authorized tenant, notifying the user, and discarding any in-flight scoped requests for the invalid tenant.
- **FR-026**: The server MUST enforce tenant scoping on every read and write independently of what the client sends, so a tampered or mistaken client cannot access other-tenant data.
- **FR-027**: The app MUST never display data from a tenant other than the active one (except within Bitacora, governed by FR-011 to FR-014), including during loading states, error states, and race conditions around tenant switching.

### Key Entities *(include if feature involves data)*

- **Active Tenant Selection**: The tenant currently governing the user's read and write scope in the UI. Scoped per user, per device. Persists across sessions until the user changes it or the membership becomes invalid.
- **Tenant Membership**: The set of tenants a user is authorized for. Drives what can appear in the top-bar selector.
- **Bitacora View Tenant**: A short-lived, view-local selection used only by the Bitacora (Logbook) module, seeded from the Active Tenant Selection and reset each time the user enters the module.

### Data Access Architecture *(mandatory for features involving data)*

This feature does not introduce new database tables, new endpoints, or new DTOs. It modifies the behavior of existing read and write paths so they uniformly respect the active tenant from the top-bar selector:

| Operation | API Endpoint (existing) | HTTP Method | How the active tenant is applied |
|-----------|-------------------------|-------------|----------------------------------|
| List users in the admin catalog | `GET /api/users` | GET | Scoped to the active tenant from the authenticated request context |
| List residents | `GET /api/residents` (or equivalent) | GET | Scoped to the active tenant |
| List visitors / providers (visit persons) | `GET /api/visit-persons` | GET | Scoped to the active tenant |
| List access events (access log) | `GET /api/access-events` | GET | Admin portal access-log is scoped to the active tenant |
| Bitacora (Logbook) base query | existing Bitacora endpoint | GET | Uses the view-local Bitacora View Tenant (seeded from the active tenant), not the active tenant directly |
| Create access event (entry/exit) | `POST /api/access-events` | POST | The active tenant at capture time is attached server-side |
| Create / edit resident, visitor, provider, vehicle | `POST` / `PATCH /api/...` | POST/PATCH | The active tenant at write time is attached server-side |
| List patrols, blacklist entries, dashboard metrics | existing endpoints | GET | Scoped to the active tenant |

**Frontend data flow**: TanStack Query → NestJS API → Repository → Supabase/Postgres. The active tenant is read from the shared authenticated store and included with every request that leaves the client. Servers re-derive and enforce the tenant scope from the authenticated context; they do not trust the client-supplied tenant blindly.

**Allowed frontend Supabase usage**: Auth (`supabase.auth.*`) and Realtime (`supabase.channel()`) only, unchanged by this feature.

**Desktop outbox**: Queued write operations capture the active tenant at the moment of capture and preserve it through sync, so offline-captured events land under the intended tenant regardless of later top-bar changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After a confirmed tenant switch, 100% of currently open list and catalog views reflect the new tenant within 1 second (for data the user is authorized to see).
- **SC-002**: 0 access events in the production database end up attached to a tenant other than the one the capturing user had active at the moment of capture (verified by audit of a representative sample across a 30-day window post-release).
- **SC-003**: 100% of tenant-switch attempts from the top-bar selector trigger the confirmation dialog before the switch takes effect.
- **SC-004**: Canceling the confirmation dialog leaves the previously active tenant in effect in 100% of cases and causes 0 measurable data reloads.
- **SC-005**: In Bitacora, the in-page tenant dropdown is pre-seeded from the top-bar active tenant on 100% of fresh entries to the module; changing the in-page dropdown does not alter the top bar in any measurable way.
- **SC-006**: Users who previously reported confusion about "which community am I looking at right now" (a known support theme) see that class of support tickets drop by at least 75% in the first quarter post-release.
- **SC-007**: Guards with multi-site assignments can correctly capture an access event for a tenant other than their default, with at most one confirmation, in under 15 seconds from deciding to switch.
- **SC-008**: Admins and super admins managing multiple tenants report (via post-release survey) ≥85% agreement that the active tenant is visible at all times and that switching is safe and predictable.

## Assumptions

- The tenant selector component already exists in the top bar of both the web portal and the desktop booth app, and already surfaces the list of tenants authorized for the signed-in user. This feature changes only its downstream effect, not its visual placement or the membership source.
- An authenticated store already exposes the active tenant (and the list of authorized tenants) to the rest of the app. This feature treats that store as the single source of truth for UI-level scoping decisions.
- Every existing catalog/list endpoint already accepts or derives a tenant scope on the server side. This feature does not design new server-side isolation primitives; it ensures the client consistently uses what is already available.
- Bitacora's own tenant dropdown already exists (confirmed by the user's description). This feature defines its relationship to the top-bar selector; it does not redesign the Bitacora UI.
- The confirmation dialog is a standard, low-friction "Switch to <tenant>?" dialog with Confirm and Cancel, not a high-ceremony step-up action (no password, no second factor).
- For the Resident role (portal consumer), the top-bar selector is either not shown or is shown as a single fixed tenant; residents' data visibility is governed by resident-ownership rules, not by tenant switching.
- For SuperAdmin, "every tenant in the system" and "tenants I am authorized for" are equivalent — the selector lists all tenants.
- The feature covers the currently existing modules named above; any module added after this spec is expected to follow the same rule by default without requiring a new spec.
