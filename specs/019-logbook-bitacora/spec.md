# Feature Specification: Access Log (Bitácora) — Admin/SuperAdmin Logbook

**Feature Branch**: `019-logbook-bitacora`
**Created**: 2026-04-22
**Status**: Draft
**Input**: User description: "Admin/SuperAdmin Logbook (Bitácora) — a read-only, paginated access-event browser at `/logbook` with three subpages (Visitors, Providers, Residents), shared filters (date range with quick presets, tenant selector for SuperAdmin, resident filter, free-text search), server-side pagination, and CSV/PDF export of the current filtered view or a bulk date range. Tenant-scoped by role: Admin sees own tenant only; SuperAdmin can pick/sweep authorized tenants; Guard and Resident receive 403."

## User Scenarios & Testing

### User Story 1 — Admin browses today's Visitor logbook (Priority: P1)

A community Admin opens the portal and goes to the Logbook to see who has visited the community today. They land on the Visitors subpage which, on first load, shows today's visitor entries and exits for their tenant, ordered most recent first, with 25 rows per page.

**Why this priority**: This is the canonical daily check-in workflow for every community Admin — "who came in today?". Without it, the Logbook has no first-load value. Defaulting to "Today" avoids unbounded queries and matches the daily rhythm of operations.

**Independent Test**: Sign in as an Admin of a tenant with visitor access events in the last 24 hours, navigate to `/logbook`, confirm redirection to `/logbook/visitors`, and verify today's rows are displayed with the expected columns (code, name, direction, resident visited, vehicle, status, registered by, date) and pagination controls.

**Acceptance Scenarios**:

1. **Given** an Admin signed in to Tenant A with visitor events in Tenant A and Tenant B, **When** they open `/logbook`, **Then** they are redirected to `/logbook/visitors`, the date range is preset to "Today", only events with `person_type = visitor` from Tenant A are shown, and zero events from Tenant B appear.
2. **Given** the Visitors subpage is rendered, **When** the Admin scans the table, **Then** they see the columns: Code, Name, Direction, Resident visited, Vehicle (plate + brand if the access was by vehicle, else empty), Status (as a translated badge), Registered by (guard name), and Date (formatted to the user's locale).
3. **Given** today has more than 25 matching rows, **When** the table renders, **Then** only 25 rows are shown, a page indicator is visible, and previous/next controls are present.
4. **Given** today has zero matching rows, **When** the table renders, **Then** a centered empty state with a translated "No records found" message is shown in place of the rows.

---

### User Story 2 — Apply date range filters to review historical events (Priority: P1)

An Admin needs to review access events from a past period — for example, yesterday's evening shift or last week's service provider activity. They change the date range filter and the table re-queries.

**Why this priority**: Without date range controls, the Logbook is only useful for "today," which is insufficient for investigations, audits, and reports. Quick presets (7/30/90 days) cover the majority of common lookups, and a custom range handles the long tail.

**Independent Test**: On any subpage, choose "Last 7 days" from the date filter and confirm the table refreshes to include events from the full 7-day window, pagination resets to page 1, and the visible row count / total matches the new filter.

**Acceptance Scenarios**:

1. **Given** the filter is on "Today" and the user is on page 3, **When** the user selects the preset "Last 7 days", **Then** the table re-queries with the new date range and the page indicator resets to page 1.
2. **Given** the filter is "Last 7 days", **When** the user switches to "Custom range" and selects a from/to date, **Then** the table re-queries with the exact inclusive range chosen and the presets dropdown reflects "Custom".
3. **Given** the user selects a custom range where "to" is earlier than "from", **When** they try to apply the range, **Then** the system prevents the query (with a translated inline error) rather than issuing an empty query.
4. **Given** the user has filters applied, **When** they refresh the page or share the URL, **Then** the same filter state is restored (filters persist in the URL).

---

### User Story 3 — Search across people, vehicles, and notes (Priority: P1)

An Admin is investigating an incident and needs to locate all access events tied to a person name, a license plate, a company, or a text fragment in the notes.

**Why this priority**: Search is the primary investigative affordance. Without it, Admins must scroll or filter by date alone, which does not scale past a single day of busy gates. Server-side search ensures correctness across the full result set.

**Independent Test**: Type a partial person name into the search input, wait for the debounce to elapse, and verify the table refreshes to show only rows matching the query across any of: person full name, person phone, person company, vehicle plate, vehicle brand, vehicle model, access event notes, or visited resident's full name.

**Acceptance Scenarios**:

1. **Given** the user types a 3-character query, **When** 300 ms pass without further typing, **Then** exactly one search request is issued (no per-keystroke flood) and the table reflects the response.
2. **Given** the user's search query matches vehicle plates only (no person names), **When** the results render, **Then** matching access events whose linked vehicle has a matching plate appear in the table.
3. **Given** the user clears the search input, **When** the input becomes empty, **Then** the search filter is removed and the table returns to the date-and-filter-only result set with pagination reset to page 1.
4. **Given** the user has a date range, a resident filter, and a search query active simultaneously, **When** the table re-queries, **Then** all three filters are combined with logical AND server-side.

---

### User Story 4 — Role-based access control (Priority: P1)

The Logbook must be visible only to Admins and SuperAdmins. Guards and Residents must be blocked at the API, not merely hidden in the UI.

**Why this priority**: Access events reveal sensitive community movement data. A missing or mis-applied guard exposes cross-tenant information or leaks data to roles that should not see it. Enforcement must happen at the API layer (and be defended-in-depth at the database layer) so that no UI bug, direct API call, or future client bypasses the check.

**Independent Test**: Issue an authenticated request to the logbook list endpoint as (a) a Guard, (b) a Resident, (c) an Admin, and (d) a SuperAdmin, and verify (a) and (b) receive 403 while (c) and (d) receive their permitted subset of data.

**Acceptance Scenarios**:

1. **Given** a user with role Guard or Resident, **When** they request any logbook endpoint, **Then** the API returns 403 Forbidden and no row content.
2. **Given** an Admin of Tenant A, **When** they request the logbook list without specifying a tenant, **Then** results are filtered to Tenant A.
3. **Given** an Admin of Tenant A, **When** they request the logbook list explicitly passing the tenant of Tenant B, **Then** the API returns 403 Forbidden (the Admin cannot target another tenant).
4. **Given** a SuperAdmin authorized for tenants A, B, C, **When** they request the logbook list without specifying a tenant, **Then** results span all three tenants; **And** when they specify tenant B, results are limited to tenant B.
5. **Given** any authenticated user, **When** a database-level request somehow bypasses the API (hypothetical defense-in-depth), **Then** row-level security still prevents returning rows outside the user's tenant scope.

---

### User Story 5 — Browse the Providers subpage (Priority: P2)

An Admin wants to review service-provider activity (deliveries, maintenance, utilities) separately from visitor traffic, with provider-specific columns (e.g., Company).

**Why this priority**: Providers carry different operational meaning than casual visitors (they are scheduled, recurring, sometimes critical). Separating them into a dedicated subpage avoids forcing Admins to filter by person type every time.

**Independent Test**: Click the "Providers" tab, confirm the table re-queries for `person_type = service_provider`, shows the provider-specific column set (adds Company, omits "Resident visited"), and the active filters persist across the tab switch.

**Acceptance Scenarios**:

1. **Given** an Admin is on `/logbook/visitors`, **When** they click the "Providers" tab, **Then** the URL transitions to `/logbook/providers` without a full page reload and the table re-queries for provider events.
2. **Given** the Providers subpage is rendered, **When** the Admin scans the table, **Then** they see the columns: Code, Name, Company, Direction, Vehicle, Status, Registered by, Date.
3. **Given** a provider row has no company on record, **When** the row renders, **Then** the Company cell displays an empty placeholder (not the string "null").
4. **Given** the Admin had a date range and search query applied on the Visitors subpage, **When** they switch to Providers, **Then** the same filters remain applied (except filters that don't apply to providers are hidden gracefully).

---

### User Story 6 — Browse the Residents subpage (Priority: P2)

An Admin wants to audit residents' own entries and exits (for example, to reconcile a late-night complaint or confirm a resident's presence).

**Why this priority**: Resident movement is a privacy-sensitive category that the Admin audits less often than visitor traffic, but the need arises in dispute and incident workflows. Separate columns (Unit, Mode) reflect the different data model (no visited resident, no company, no status badge).

**Independent Test**: Click the "Residents" tab, confirm the table re-queries for `person_type = resident`, and the residents-specific columns (Name, Unit, Direction, Mode, Vehicle, Registered by, Date) are displayed.

**Acceptance Scenarios**:

1. **Given** an Admin selects the Residents tab, **When** the table renders, **Then** the columns shown are: Name (resident's full name), Unit (resident's unit number), Direction, Mode (vehicle/pedestrian, translated), Vehicle (plate + brand when mode = vehicle), Registered by, Date.
2. **Given** the resident filter is used on this subpage, **When** the Admin picks a resident, **Then** the table shows only that resident's own entries and exits (not events involving other people visiting that resident).
3. **Given** a resident access event was by pedestrian, **When** the row renders, **Then** the Vehicle cell is empty.

---

### User Story 7 — Filter by resident (Priority: P2)

An Admin wants to see all visitors (or providers) that called on a specific resident's unit, or on the Residents subpage, all of one resident's own comings and goings.

**Why this priority**: The resident-centric view supports common concierge and complaint-handling workflows ("show me everyone who visited unit 304 last week"). The searchable combobox handles communities with hundreds of residents.

**Independent Test**: Open the resident combobox, type a partial name, pick a resident, and verify the table filters to access events linked to that resident in the role appropriate to the subpage.

**Acceptance Scenarios**:

1. **Given** the Admin opens the resident combobox on the Visitors or Providers subpage, **When** they type a partial name, **Then** the combobox shows matching residents belonging to the current tenant scope (with debounce).
2. **Given** the Admin selects a resident on the Visitors subpage, **When** the table re-queries, **Then** only visitor events whose linked `visit_person.resident_id` matches the selected resident are shown.
3. **Given** the Admin selects a resident on the Residents subpage, **When** the table re-queries, **Then** only that resident's own entry/exit events are shown.
4. **Given** the Admin clears the resident filter, **When** the field empties, **Then** the table re-queries without the resident constraint and pagination resets to page 1.

---

### User Story 8 — SuperAdmin switches tenants (Priority: P2)

A SuperAdmin who manages several tenants wants to view all tenants' logbooks at once, or drill into a single tenant for a targeted review.

**Why this priority**: SuperAdmins triage across a portfolio. Forcing them to log out / log in to switch tenants would cripple their workflow. The tenant selector must be gated to SuperAdmins only — ordinary Admins should never see it.

**Independent Test**: Sign in as a SuperAdmin authorized for multiple tenants, confirm the tenant selector is visible on the filter bar, verify that "all tenants" is the default and shows merged results, then pick a single tenant and verify the table re-queries and shows only that tenant's rows.

**Acceptance Scenarios**:

1. **Given** a SuperAdmin is on the Logbook, **When** the filter bar renders, **Then** a tenant selector is visible populated with only the tenants the SuperAdmin is authorized for.
2. **Given** a SuperAdmin leaves the tenant selector empty (or "All"), **When** the table queries, **Then** results span every tenant the SuperAdmin is authorized for, combined into one paginated list.
3. **Given** a SuperAdmin selects a specific tenant, **When** the table re-queries, **Then** only rows for that tenant are returned and pagination resets to page 1.
4. **Given** an Admin (not SuperAdmin) is on the Logbook, **When** the filter bar renders, **Then** the tenant selector is not present in the DOM and no call to list tenants is issued.

---

### User Story 9 — Export the current filtered view (Priority: P3)

An Admin wants to share, archive, or further analyze the rows currently matched by the filter set. They click Export → "Export current view" and receive a CSV download that reflects the active filters.

**Why this priority**: Export is valuable but not blocking the core browse workflow. P3 because day-to-day review does not depend on it, but auditors and building committees require exports for offline record-keeping.

**Independent Test**: With any filter combination producing at least 10 rows across multiple pages, click Export → "Export current view" and verify the downloaded file contains every row matching the filters (not only the current page) with the exact column set visible in the table, correctly encoded for the user's locale.

**Acceptance Scenarios**:

1. **Given** the Admin has a filter set that yields 142 rows across several pages, **When** they click Export → "Export current view", **Then** the downloaded file contains all 142 rows (not only the 25 visible on page 1) with the current subpage's column headers translated.
2. **Given** the user is on the Providers subpage with a search query, **When** they export, **Then** the file is named `logbook-providers-<yyyy-mm-dd>.csv` where the date is today's tenant-local date.
3. **Given** the export takes more than 1 second to generate, **When** the file is being produced, **Then** a loading indicator is shown on the Export button and the button is disabled to prevent duplicate submissions.
4. **Given** the export fails (network or server error), **When** the error is returned, **Then** a translated error toast is shown and the button is re-enabled.

---

### User Story 10 — Export a bulk date range via modal (Priority: P3)

An Admin needs to export a longer period than the one currently filtered (e.g., "all visitor events from January through March"). They click Export → "Export all" and enter an explicit date range.

**Why this priority**: Handles audit, compliance, and month-end reporting use cases. Same presets as the filter bar keep the UX consistent.

**Independent Test**: Click Export → "Export all", confirm a modal requires a date range (quick presets + custom), pick "Last 3 months," confirm, and verify the returned file contains every row in that range for the current subpage/tenant scope.

**Acceptance Scenarios**:

1. **Given** the Admin opens the "Export all" modal, **When** they confirm without picking a date range, **Then** the confirmation is blocked and a translated inline message prompts them to choose a range.
2. **Given** the Admin picks "Last 30 days" in the modal, **When** they confirm, **Then** the export is generated for the 30-day range, honoring the current subpage's person type and the current tenant scope (but ignoring the filter bar's date range).
3. **Given** the "Export all" modal is open, **When** the Admin cancels, **Then** the modal closes without a network request and no file is generated.

---

### Edge Cases

- **Time zone boundaries**: "Today" is defined relative to the tenant's local time zone (recorded on the tenant record), not the viewer's browser, so that Admins in different time zones see the same day's events. Dates in the table are additionally formatted for the viewer's locale for display.
- **DST transitions**: When a custom date range crosses a DST boundary, the range is still inclusive in the tenant's local time zone (no missing or double-counted hours).
- **Admin without tenant**: If a user's JWT has role Admin but no `tenant_id`, all logbook endpoints return 403 (the Admin is not associated with any tenant and cannot be scoped).
- **SuperAdmin with zero authorized tenants**: The tenant selector renders empty and the table shows the translated "No records found" empty state.
- **Simultaneous filter changes**: Typing in the search box while the date preset is being changed must still produce a correct final query (debounce windows should not race — the last committed filter set wins).
- **Filter preset mismatch after navigation**: If the user navigates back to the Logbook via the browser, the URL-persisted filters are restored verbatim, including custom date ranges.
- **Stale pagination**: If a filter change reduces the total below the current page number × page size, pagination resets to page 1 automatically.
- **Service-provider row without linked resident**: Providers may have `resident_id = null`. The Providers subpage does not show a Resident column, so no empty placeholder is needed. A Visitors row whose visit_person is flagged/deleted continues to display with its status badge and the name at the moment of the event.
- **Vehicle present but not linked**: For rows with `access_mode = pedestrian`, the Vehicle column is always empty, even if a vehicle was registered for that person.
- **Export with zero matching rows**: The export produces a file with only the header row (no data). A translated inline note on the Export button indicates "No rows to export" before the user clicks, disabling the action.
- **Concurrency during export**: While an export is generating, the filter bar remains interactive but a new export click is prevented until the previous one resolves.

## Requirements

### Functional Requirements

#### Navigation & Shell

- **FR-001**: System MUST expose the Logbook at the route `/logbook` for Admins and SuperAdmins and MUST redirect it to `/logbook/visitors` as the default subpage.
- **FR-002**: System MUST expose three subpages: `/logbook/visitors`, `/logbook/providers`, `/logbook/residents`, each filtering access events by `person_type` values `visitor`, `service_provider`, and `resident` respectively.
- **FR-003**: Switching between subpages MUST happen via an in-page tab navigation that preserves the filter state where applicable and does NOT require a full page reload.
- **FR-004**: The Logbook entry MUST appear in the primary navigation for users with role Admin or SuperAdmin and MUST NOT appear for users with role Guard or Resident.

#### Table & Pagination

- **FR-005**: System MUST render a paginated, read-only data table whose rows are not inline-editable and do not open a detail view on click in this MVP.
- **FR-006**: The default page size MUST be 25 rows. The user MUST be able to choose among page sizes 10, 25, 50, and 100.
- **FR-007**: Pagination MUST be server-side. The server MUST return `{ data, total, page, page_size }` per request.
- **FR-008**: Pagination controls MUST include previous/next, a current/total page indicator, and the page size selector, positioned below the table.
- **FR-009**: When zero rows match, the table area MUST display a centered, translated "No records found" message.
- **FR-010**: Rows MUST be sorted by access-event timestamp in descending order (most recent first) by default. No user-configurable sort is required in this MVP.

#### Columns per subpage

- **FR-011**: On the Visitors subpage, columns MUST be: Code, Name, Direction (entry/exit, translated), Resident visited, Vehicle (plate + brand when `access_mode = vehicle`, else empty), Status (allowed/flagged/denied — translated badge), Registered by (guard full name), Date (localized).
- **FR-012**: On the Providers subpage, columns MUST be: Code, Name, Company, Direction, Vehicle, Status, Registered by, Date.
- **FR-013**: On the Residents subpage, columns MUST be: Name, Unit (resident's unit number), Direction, Mode (vehicle/pedestrian, translated), Vehicle, Registered by, Date.
- **FR-014**: All enumerated values displayed in the table (direction, access_mode, status) MUST be rendered through translated labels — no raw enum strings in the UI.

#### Filters

- **FR-015**: System MUST provide a date range filter with quick presets: Today, Last 7 days, Last 30 days, Last 3 months, Custom range. The default MUST be Today.
- **FR-016**: "Today" and all presets MUST be computed in the tenant's local time zone (per tenant record).
- **FR-017**: For SuperAdmins, the filter bar MUST include a tenant selector populated from the list of tenants the SuperAdmin is authorized to manage. Leaving the selector empty MUST mean "all authorized tenants."
- **FR-018**: For Admins, the tenant selector MUST NOT be rendered, MUST NOT be callable via hidden requests, and the tenant scope MUST be derived exclusively from the JWT.
- **FR-019**: System MUST provide a resident combobox filter that searches the residents of the current tenant scope. On Visitors and Providers subpages, selecting a resident filters events to those where `visit_person.resident_id` matches. On the Residents subpage, selecting a resident filters to that resident's own events.
- **FR-020**: System MUST provide a free-text search input with a 300 ms debounce. The server MUST match the query across: `visit_persons.full_name`, `visit_persons.phone`, `visit_persons.company`, `vehicles.plate`, `vehicles.brand`, `vehicles.model`, `access_events.notes`, and the visited resident's `users.full_name`. Matching MUST be case-insensitive and substring-based.
- **FR-021**: Changing any filter MUST reset pagination to page 1.
- **FR-022**: The active filter set MUST be reflected in the URL (query string) so that refreshing the page or sharing the URL restores the same view.
- **FR-023**: Filters MUST combine via logical AND on the server; there is no OR semantics across filter categories.

#### Access Control

- **FR-024**: The Logbook list and export endpoints MUST be accessible only to users with role `super_admin` or `admin`. Role `guard` and role `resident` MUST receive HTTP 403.
- **FR-025**: For role `admin`, the API MUST derive tenant scope from the JWT's `tenant_id`. Any request that explicitly targets a different `tenant_id` MUST return HTTP 403 (the Admin cannot spoof scope).
- **FR-026**: For role `super_admin`, the API MUST accept an optional `tenant_id` parameter. When omitted, results span all tenants the SuperAdmin is authorized for. When present, results MUST be limited to that tenant and the tenant MUST be in the SuperAdmin's authorized set (otherwise HTTP 403).
- **FR-027**: Database row-level security policies on `access_events` MUST act as a second layer of defense such that a row outside the caller's tenant scope is never returned even if an API-level check is missed.

#### Export

- **FR-028**: System MUST provide an Export action with two modes: "Export current view" and "Export all".
- **FR-029**: "Export current view" MUST produce a file containing every row matching the currently applied filters across all pages (not only the rows on the visible page). No additional user input MUST be required.
- **FR-030**: "Export all" MUST open a modal that forces the user to pick a date range (same presets as the filter bar, or a custom range) before the file is generated. The modal MUST ignore the filter bar's own date range and use the range picked in the modal instead, while honoring the current subpage's `person_type` and the current tenant scope.
- **FR-031**: Export files MUST be named `logbook-<subpage>-<yyyy-mm-dd>.csv`, where `<subpage>` is one of `visitors`, `providers`, `residents` and the date is today's date in the tenant's time zone.
- **FR-032**: Exports MUST be produced in CSV format only. PDF export is explicitly out of scope for this feature and is deferred to a post-MVP enhancement.
- **FR-033**: During export generation, the UI MUST show a loading indicator and prevent duplicate submissions. A failed export MUST show a translated error message without crashing the page.
- **FR-034**: Exports MUST be tenant-scoped by the same rules as the list endpoint (Admin: own tenant only; SuperAdmin: authorized tenants only; Guard/Resident: 403).
- **FR-035**: Export column headers and enumerated-value cells MUST be rendered in the user's current locale so that the exported file is legible to the same audience reading the on-screen table.

#### Data

- **FR-036**: System MUST source rows from `access_events` and MUST join to `visit_persons`, `users`, and `vehicles` as needed to populate the displayed columns. No row may be fabricated or derived from cached/computed state outside the API.
- **FR-037**: The API response for each row MUST be denormalized enough to render the table without further calls (i.e., the row contains the guard's name, the visited resident's name, the visitor's code, the vehicle plate+brand, etc.).

#### Internationalization

- **FR-038**: Every user-visible string — including column headers, filter labels, preset names, button text, badge labels (allowed/flagged/denied), direction labels (entry/exit), access mode labels (vehicle/pedestrian), empty state, export options, modal copy, and error messages — MUST be sourced from the shared translation catalog. No hardcoded strings.

#### Performance envelope

- **FR-039**: The default page (Today + page size 25) MUST return within 1 second under normal load.
- **FR-040**: Search/filter changes MUST produce new results within 1 second under normal load (excluding network latency).

### Key Entities

- **Access Event**: An append-only entry/exit log record with tenant scope, person type (visitor/service_provider/resident), direction (entry/exit), access mode (vehicle/pedestrian), optional vehicle reference, registering guard, notes, and timestamp. The Logbook is a read-only projection of this entity.
- **Visit Person**: The visitor or service-provider registry (one record per non-resident person), holding code, full name, phone, company (providers only), status (allowed/flagged/denied), and optional resident-being-visited link. The Logbook uses this for display columns only — it does not create or update visit persons.
- **User (Profile)**: Identity for residents, guards, admins, super admins. The Logbook uses `full_name` (for guard and resident display), `unit_number` (for the Residents subpage), and `role` / `tenant_id` (for access control).
- **Vehicle**: The shared vehicle registry. The Logbook displays `plate` and `brand` when `access_mode = vehicle` and does not modify vehicle records.
- **Tenant**: The community container. Used for scoping all queries and as the source of the local time zone for "Today" calculations.

### Data Access Architecture

| Operation                        | API Endpoint                                  | HTTP Method | Request DTO                  | Response DTO                              |
|----------------------------------|-----------------------------------------------|-------------|------------------------------|-------------------------------------------|
| List paginated access events     | GET `/api/access-events`                      | GET         | `AccessEventListQueryDto`    | `PaginatedResponse<AccessEventListItem>`  |
| Export current view (filtered)   | GET `/api/access-events/export`               | GET         | `AccessEventExportQueryDto`  | File stream (`Content-Disposition: attachment`) |
| Export bulk date range           | GET `/api/access-events/export`               | GET         | `AccessEventExportQueryDto` (with explicit date range) | File stream |
| List residents for combobox      | GET `/api/residents` (existing)               | GET         | `ResidentListQueryDto` (existing) | `PaginatedResponse<Resident>` (existing) |
| List tenants (SuperAdmin only)   | GET `/api/tenants` (existing)                 | GET         | —                            | `{ data: Tenant[] }` (existing)           |

**Query parameters** for `AccessEventListQueryDto`: `person_type` (required; one of `visitor`/`service_provider`/`resident`), `page` (default 1), `page_size` (default 25; one of 10/25/50/100), `date_from` (ISO date, tenant time zone), `date_to` (ISO date, tenant time zone), `tenant_id` (optional; ignored/rejected per role rules), `resident_id` (optional UUID), `search` (optional free-text).

**Query parameters** for `AccessEventExportQueryDto`: same as list query (no `format` parameter — CSV is the only supported format).

**Frontend data flow**: TanStack Query → NestJS API → Repository → Supabase/Postgres. The frontend MUST NOT call Supabase `.from()`, `.rpc()`, or `.storage` directly for any Logbook data.
**Allowed frontend Supabase usage**: Auth (`supabase.auth.*`) and Realtime (`supabase.channel()`) only — neither is used in this feature.

## Success Criteria

### Measurable Outcomes

- **SC-001**: An Admin can open `/logbook` and see today's visitor events for their tenant in under 3 seconds from navigation click, with no manual filter adjustments required.
- **SC-002**: An Admin investigating a past event can locate it (by name, plate, or date) in under 10 seconds from the Logbook loading, starting from a cold load.
- **SC-003**: Search or filter changes produce updated results within 1 second under normal operating load (measured at the p95).
- **SC-004**: In a controlled access-control audit of the API (scripted requests with mismatched tenant IDs, non-authorized roles, and omitted tokens), cross-tenant row leakage is zero and 100% of Guard/Resident requests are denied with HTTP 403.
- **SC-005**: A month-end "Export all" for a tenant with up to ~5,000 access events completes and begins streaming within 15 seconds.
- **SC-006**: An Admin can switch between the Visitors, Providers, and Residents subpages with no full page reload; the new subpage's data becomes visible within 1 second.
- **SC-007**: The Logbook is functional and usable in both supported display locales (Spanish and English as currently supported by the shared translation catalog) with no untranslated visible strings.
- **SC-008**: First-time users (Admins with no prior training) successfully complete a "find today's entries for resident X" task on their first attempt, without help.

## Assumptions

The following decisions were taken from the feature prompt, industry defaults, and the existing codebase. They are not flagged for clarification but are documented so that downstream planning and review can confirm or challenge them.

- **CSV is the only MVP export format.** PDF export is out of scope for this feature (see FR-032 and the "Out of Scope" list) and is deferred to a post-MVP enhancement.
- **"Export current view" exports all filtered rows, not only the visible page.** The prompt's phrase "rows currently displayed" is interpreted as "all rows that match the active filters" because exporting only 25 of 142 matching rows would rarely meet an Admin's intent. The "Export all" modal still differs in that it forces an explicit date range and ignores the filter bar's date range, serving bulk and compliance use cases.
- **Filters are reflected in the URL** (query string) so views are shareable, bookmarkable, and survive refresh.
- **Time zone is tenant-local.** "Today" is computed in the tenant's local time zone. If a tenant record lacks an explicit time zone, the system default (UTC) applies and the planning phase is expected to confirm/populate tenant time zones.
- **No row detail drill-down in this MVP.** Rows are non-interactive. Opening a side sheet to inspect an individual event is out of scope and can be added later.
- **No email/async export.** Exports are synchronous streaming downloads. Async generation with email delivery is a future enhancement once real data volumes are known.
- **Residents combobox queries the existing residents list endpoint.** The combobox may serve residents that have never had an access event, which is acceptable (the resulting table will simply be empty).
- **"All tenants" is the default for SuperAdmin.** A SuperAdmin with many tenants sees a merged view on first load. The initial render may therefore be slower than for a single-tenant Admin; it is still expected to meet SC-001 for normal tenant portfolio sizes.
- **Tab navigation preserves filter state.** Moving between Visitors/Providers/Residents keeps the date range, search, and tenant selection. The resident combobox is also preserved but the server applies it in a subpage-appropriate way (visitor/provider → `visit_person.resident_id`; resident → `user_id`).
- **The existing `/api/tenants` endpoint suffices for the SuperAdmin tenant selector** (verified: role-gated to super_admin/admin, returns the caller's authorized tenants).
- **The existing `/api/access-events` module gains new list/export endpoints** rather than a new module. Existing create/update/recent endpoints are unaffected.
- **Existing `access_events` schema and RLS cover all needs.** No database migration is anticipated for this feature; the planning phase will confirm.

## Out of Scope

- PDF export (either "Export current view" or "Export all") — CSV is the only MVP format.
- Creating, editing, or deleting access events from the Logbook (those flows remain in their existing feature — the guard booth and the visit-person sidebars).
- Real-time (subscription-driven) updates. The Logbook re-queries on user action only; there is no live push.
- Multi-column sorting, grouping, or pivoting.
- Email delivery or scheduled recurring exports.
- Asynchronous export with background jobs and notifications.
- Charts, summary cards, or analytics dashboards built on top of the log.
- Editable saved filters / user-defined named views.
