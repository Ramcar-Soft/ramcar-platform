# Feature Specification: Tenants Catalog and Multi-Tenant Access for Admin/Guard

**Feature Branch**: `020-tenants-catalog`
**Created**: 2026-04-22
**Status**: Draft
**Input**: User description: "Tenants Catalog at `/catalogs/tenants` for SuperAdmin and Admin to create/edit communities, plus a breaking change that lets Admin and Guard users be assigned to multiple tenants via a new `user_tenants` join table. Residents remain single-tenant. Adds a tenant selector to the TopBar for users assigned to 2+ tenants, a multi-select combobox in the Users form, and updates JWT claims / RLS / the auth Zustand slice to carry a `tenant_ids` set."

## User Scenarios & Testing

### User Story 1 — SuperAdmin creates a new tenant from the catalog (Priority: P1)

A SuperAdmin needs to onboard a new community onto the platform. They navigate to `/catalogs/tenants`, open the create sheet, enter the community's name and address, confirm the default active status, and save. The new tenant appears in the catalog table immediately.

**Why this priority**: Onboarding a new community is the canonical workflow that justifies the existence of the catalog. Without it, the platform cannot grow to new customers. All other user stories (multi-tenant assignment, selector, RLS updates) exist to support the catalog's output — creating and editing tenants.

**Independent Test**: Sign in as a SuperAdmin, navigate to `/catalogs/tenants`, click "Create Tenant", fill in name and address, submit, and verify (a) the new row appears in the table without a full page reload, (b) the tenant is persisted and visible on a fresh load, (c) no `user_tenants` row is auto-inserted for the SuperAdmin (they have implicit access to all tenants).

**Acceptance Scenarios**:

1. **Given** a SuperAdmin signed into the portal, **When** they open the main navigation, **Then** an entry for "Tenants" (or the localized equivalent) appears under the Catalogs section and links to `/catalogs/tenants`.
2. **Given** a SuperAdmin is on `/catalogs/tenants`, **When** the page renders, **Then** a table listing every tenant in the system is shown, ordered by creation date descending, with columns for Name, Address, Status (translated badge), Created, and Actions.
3. **Given** a SuperAdmin clicks "Create Tenant", **When** the create sheet opens, **Then** a right-side Sheet slides in with fields for Name (required, max 255 chars), Address (required), and Status (toggle, defaults to active). The Config field is not rendered.
4. **Given** the SuperAdmin submits the form with valid values, **When** the API responds successfully, **Then** (a) the sheet closes, (b) a translated success toast appears, (c) the new tenant row appears at the top of the table without a full page reload, (d) the React Query cache for tenants is invalidated and re-fetched.
5. **Given** the SuperAdmin submits with a missing required field, **When** validation runs, **Then** a translated inline error message is shown next to the empty field and no network request is made.
6. **Given** a SuperAdmin creates a tenant, **When** the backend processes the request, **Then** no `user_tenants` row is inserted (SuperAdmins have wildcard access via their role).

---

### User Story 2 — Admin and Guard users can be assigned to multiple tenants (Priority: P1)

An operator who rotates between communities — for example, a security guard who works three adjacent residential complexes, or a district Admin who oversees two fraccionamientos — needs to access each assigned community's data without logging in and out. The system stores their assigned tenants in a dedicated join table, exposes the set on their JWT as a `tenant_ids` claim, and every API call is scoped against that set.

**Why this priority**: This is the structural breaking change that makes the rest of the feature viable. Without the `user_tenants` join, the catalog page has no multi-assignment target, the TopBar tenant selector has nothing to switch between, and the API has no way to validate cross-tenant requests. It must land as P1 alongside Story 1 — the catalog alone is inert without it.

**Independent Test**: Apply the migration, assign a test guard user to two tenants via `user_tenants`, sign them in, decode their JWT, and verify (a) the JWT contains a `tenant_ids` array of both tenant IDs, (b) every API call that reads tenant-scoped data returns merged rows from both tenants, (c) a request explicitly targeting a third (unassigned) tenant returns HTTP 403.

**Acceptance Scenarios**:

1. **Given** the migration has been applied, **When** a new row in `user_tenants` links a guard user to a tenant, **Then** on their next sign-in their JWT carries a `tenant_ids` claim listing every tenant they are assigned to.
2. **Given** an Admin with two tenants in their `tenant_ids` claim, **When** they call a list endpoint (e.g., `/api/users`, `/api/residents`, `/api/visit-persons`) without a tenant filter, **Then** the response includes rows from both assigned tenants only — never any other tenant, never zero if data exists for either.
3. **Given** an Admin's `tenant_ids = [A, B]`, **When** they call any endpoint explicitly passing `tenant_id = C`, **Then** the API returns HTTP 403.
4. **Given** a SuperAdmin signs in, **When** their JWT is issued, **Then** the `tenant_ids` claim is the wildcard `"*"` (or an equivalent signal that the user is not scoped by the join table).
5. **Given** a Resident signs in, **When** their JWT is issued, **Then** the `tenant_ids` claim contains exactly one element: the value of `profiles.tenant_id` for that user. The `user_tenants` table is NOT consulted for residents.
6. **Given** existing admin/guard rows predating this feature (each has exactly one `profiles.tenant_id`), **When** the migration runs, **Then** each such user has exactly one row inserted into `user_tenants` referencing their previously-single tenant; no admin/guard loses access after deploy.
7. **Given** the RLS policies have been updated, **When** a database query executes for an authenticated admin or guard, **Then** rows outside the user's assigned tenants are filtered out at the database layer even if the API-level check is bypassed.

---

### User Story 3 — Tenant selector in the TopBar for multi-tenant users (Priority: P1)

A guard assigned to three communities signs in and, before starting their shift, picks which community they're working that day from the TopBar. An Admin who manages two fraccionamientos switches between them in the middle of a review session without reloading the page. The platform re-fetches all tenant-scoped data for the newly active tenant automatically.

**Why this priority**: Without the selector, multi-tenant users have no way to target a specific community — they either see merged data (confusing for an operator) or are stuck in whichever tenant loads first. The selector is the UX primitive that makes multi-tenant assignment usable at all. Pairs with Story 2 as the front-end counterpart of the breaking change.

**Independent Test**: Sign in as a user with three assigned tenants, confirm the TopBar renders a tenant selector showing the currently active tenant, open the dropdown, search for a tenant by partial name, pick it, and verify (a) the Zustand auth slice updates `activeTenantId` and `activeTenantName`, (b) React Query invalidates every tenant-scoped key, (c) the visible page re-fetches its data with the new tenant context, (d) the URL is unchanged.

**Acceptance Scenarios**:

1. **Given** a user is signed in and has 2 or more assigned tenants (or is a SuperAdmin with 2+ authorized tenants), **When** the TopBar renders, **Then** a tenant selector appears between the tenant name display and the theme toggle.
2. **Given** a user has exactly one assigned tenant, **When** the TopBar renders, **Then** the tenant selector is NOT rendered (no empty dropdown, no single-item dropdown).
3. **Given** a Resident is signed in, **When** the TopBar renders, **Then** the tenant selector is NOT rendered regardless of any join-table state.
4. **Given** the tenant selector is open, **When** the user types a query into the search input, **Then** the tenant list filters in place to matches by name; the active tenant always remains visible (or is clearly marked) with a checkmark.
5. **Given** the user picks a different tenant from the dropdown, **When** the selection commits, **Then** (a) `activeTenantId` in the Zustand auth slice updates, (b) `activeTenantName` updates, (c) every tenant-scoped React Query cache is invalidated, (d) the visible page re-queries without a browser reload, (e) no URL change is performed.
6. **Given** the user reloads the page after switching tenants, **When** the app hydrates, **Then** the previously active tenant is restored (active tenant selection persists across reloads for the same session).
7. **Given** a SuperAdmin opens the selector, **When** the list renders, **Then** every tenant in the system is listed (not only tenants the SuperAdmin has `user_tenants` rows for — SuperAdmin has implicit access).
8. **Given** an Admin or Guard opens the selector, **When** the list renders, **Then** only the tenants in their `tenant_ids` claim are listed.

---

### User Story 4 — Admin creates a tenant and is auto-assigned to it (Priority: P1)

A district Admin who already manages one community needs to spin up a second community without waiting for a SuperAdmin. They open `/catalogs/tenants`, create the new tenant, and are immediately assigned to it — the new tenant shows up in their TopBar selector and they can start configuring it.

**Why this priority**: Makes the Admin self-sufficient for horizontal expansion. If Admins can only ever be granted access by a SuperAdmin, the onboarding flow becomes a bottleneck. Pairs with Story 1 as the Admin-scoped variant.

**Independent Test**: Sign in as an Admin, navigate to `/catalogs/tenants`, create a new tenant, and verify (a) the tenant is created in the database, (b) a `user_tenants` row links the Admin to the new tenant with `assigned_by` = the Admin's own user id, (c) the Admin's `tenant_ids` claim on the next token refresh includes the new tenant, (d) the new tenant appears in the TopBar tenant selector (the selector now shows 2+ tenants if the Admin previously had 1).

**Acceptance Scenarios**:

1. **Given** an Admin is signed in, **When** they open the main navigation, **Then** an entry for "Tenants" is visible and links to `/catalogs/tenants`.
2. **Given** an Admin is on `/catalogs/tenants`, **When** the table renders, **Then** only tenants they are assigned to (via `user_tenants`) are listed — not every tenant in the system.
3. **Given** an Admin clicks "Create Tenant" and submits a valid form, **When** the backend processes the request, **Then** (a) the tenant row is created, (b) a `user_tenants` row links the Admin to the new tenant with `assigned_by = <admin user id>`, (c) the new tenant appears in the Admin's catalog list, (d) the Admin's JWT on the next refresh includes the new tenant in `tenant_ids`.
4. **Given** the Admin's token has been refreshed after the create, **When** the TopBar re-renders, **Then** the tenant selector reflects the new tenant in its list (and becomes visible if the Admin previously had exactly one tenant).
5. **Given** the create request succeeds, **When** the API responds, **Then** the API logs a TODO comment (in the code; not a runtime log) indicating that a future subscription-tier limit check should be enforced here — the v1 behavior is explicitly unrestricted.

---

### User Story 5 — Edit a tenant (Priority: P2)

A SuperAdmin notices a typo in a tenant's address, opens the row, corrects the field, and saves. An Admin who manages one of two assigned tenants updates the address of their own assigned community to match a recent street-renaming.

**Why this priority**: Editing is a routine maintenance task. It isn't required to prove multi-tenant assignment or selector behavior, so it is P2 behind the creation flow. Still, a read-only catalog would be frustrating in practice.

**Independent Test**: Sign in as a SuperAdmin, click the Edit action on any tenant row, change the address, save, and verify the updated address persists and appears in the table without a full page reload.

**Acceptance Scenarios**:

1. **Given** a SuperAdmin is on `/catalogs/tenants`, **When** they click the Edit action on any row, **Then** a right-side Sheet opens prefilled with that tenant's current values.
2. **Given** an Admin is on `/catalogs/tenants`, **When** they view the Actions column, **Then** the Edit action is enabled for tenants in their `tenant_ids`, and disabled or hidden for any other tenant row (but an Admin's list already shows only assigned tenants — see FR).
3. **Given** an Admin attempts to PATCH a tenant they are not assigned to (via direct API call, bypassing the UI), **When** the request reaches the API, **Then** the API returns HTTP 403.
4. **Given** a SuperAdmin changes the Status toggle from active to inactive, **When** they save, **Then** the tenant's status is updated in the database and its status badge reflects the new state in the table.
5. **Given** the edit sheet is open and the SuperAdmin makes changes but cancels without saving, **When** the Sheet closes, **Then** no PATCH request is issued and the table row values are unchanged.
6. **Given** the edit submission fails due to a validation error, **When** the API responds 4xx, **Then** the form displays the translated error messages and keeps the Sheet open so the user can correct and retry.

---

### User Story 6 — Creating an Admin or Guard user with multi-tenant assignment (Priority: P2)

A SuperAdmin creates a new guard who will rotate between three communities. Instead of picking a single tenant, the SuperAdmin selects all three from a multi-select combobox and designates one as the primary tenant. The guard's account is persisted with rows in `user_tenants` for all three tenants and `profiles.tenant_id` set to the primary one.

**Why this priority**: Multi-tenant user creation is what populates the join table in the first place. Without it, only SuperAdmins can manually insert rows via SQL. P2 because the feature's structural pieces (migration, JWT claim, selector) are functional before any admin/guard is multi-assigned in the UI, but manual SQL assignment is not a sustainable workflow.

**Independent Test**: Sign in as a SuperAdmin, open the Users catalog (existing), click Create User, pick the role "guard", and verify (a) the tenant field renders as a multi-select combobox (not the previous single dropdown), (b) picking multiple tenants adds them as chips, (c) one selection is marked as primary (with a visible indicator), (d) saving writes one `user_tenants` row per selected tenant and sets `profiles.tenant_id` to the primary, (e) the guard's JWT on their first sign-in reflects all assigned tenants.

**Acceptance Scenarios**:

1. **Given** a SuperAdmin is creating or editing a user and has picked the role `admin` or `guard`, **When** the tenant field renders, **Then** it is a searchable multi-select combobox (with chips) — not a single-value dropdown.
2. **Given** a SuperAdmin is creating or editing a user with role `resident`, **When** the tenant field renders, **Then** it remains a single-value dropdown.
3. **Given** the multi-select combobox has multiple tenants picked, **When** the form renders, **Then** exactly one tenant is marked as the primary (defaulting to the first selected; the user can change which one is primary).
4. **Given** an Admin is creating a guard user, **When** the tenant multi-select renders, **Then** the combobox options are restricted to tenants in the Admin's `tenant_ids` — the Admin cannot assign the new guard to a tenant they themselves don't belong to.
5. **Given** an Admin attempts to create a user with role `admin`, **When** the role picker is rendered, **Then** `admin` is not an available option — only SuperAdmins can create admin users (admin role selection is hidden or disabled with a tooltip).
6. **Given** the SuperAdmin submits a create form with three tenants selected and the middle one marked as primary, **When** the backend processes the request, **Then** (a) the profile row is created with `tenant_id` = the primary tenant id, (b) three `user_tenants` rows are inserted (one per selected tenant) with `assigned_by` = the creating user's id, (c) if editing an existing user, rows for removed tenants are deleted.
7. **Given** the SuperAdmin edits an existing admin/guard user and removes a tenant from the multi-select, **When** they save, **Then** the corresponding `user_tenants` row is deleted — the user loses access to that tenant on their next token refresh.
8. **Given** the user edits themselves and removes the primary tenant, **When** the form validates, **Then** an inline error prevents submission (a primary tenant is mandatory for admin/guard).

---

### User Story 7 — Role-based access control for the catalog (Priority: P2)

A Guard navigating the main menu never sees a "Tenants" entry. A Resident who types `/catalogs/tenants` in the URL bar is redirected away or receives a 403. Neither role ever reaches the catalog, and direct API calls from their sessions are rejected.

**Why this priority**: Defense in depth. Hiding the nav entry is cosmetic; the real enforcement must be at the API and at RLS. P2 because the catalog itself is the primary P1 deliverable; this story ensures the other roles can't reach it.

**Independent Test**: Sign in as a Guard, confirm no "Tenants" nav entry appears. Manually navigate to `/catalogs/tenants` — the app redirects to the Guard's default landing page. Call `/api/tenants` with the Guard's token — receive HTTP 403. Sign in as a Resident and repeat — same outcomes.

**Acceptance Scenarios**:

1. **Given** a user's role is `guard` or `resident`, **When** the main navigation renders, **Then** the "Tenants" menu entry does not appear.
2. **Given** a user's role is `guard` or `resident`, **When** they manually navigate to `/catalogs/tenants`, **Then** they are either redirected to their default landing page or shown a translated 403 notice, with no API call issued.
3. **Given** a user with role `guard` or `resident` issues a request to `GET`, `POST`, or `PATCH` on `/api/tenants` directly (token replay, `curl`, etc.), **When** the API processes the request, **Then** it returns HTTP 403.
4. **Given** a user with role `super_admin` or `admin`, **When** they issue a request to `GET /api/tenants`, **Then** the response is scoped by role: SuperAdmin sees all; Admin sees only tenants in their `tenant_ids`.

---

### User Story 8 — Search and filter tenants in the catalog (Priority: P3)

A SuperAdmin who manages dozens of communities searches the catalog by typing "los robles" into the search input and sees only tenants whose name or address contains that substring. They switch the status filter from "All" to "Inactive" to find deactivated communities during a quarterly review.

**Why this priority**: Search and filter are helpful at scale but not required for an MVP that expects a small catalog to start with. P3 because the first release may only have a handful of tenants per SuperAdmin; search becomes necessary once the catalog grows past ~30 rows.

**Independent Test**: From `/catalogs/tenants`, type a partial tenant name into the search input, wait for the 300 ms debounce, and verify the table re-queries server-side and shows only matching rows. Change the status filter to "Inactive" and verify only inactive tenants are shown.

**Acceptance Scenarios**:

1. **Given** the catalog table is loaded, **When** the user types at least 2 characters into the search input, **Then** after a 300 ms debounce the table re-queries the server with the search query and shows only matching rows by name or address (case-insensitive substring).
2. **Given** the user selects "Active" from the status filter, **When** the table re-queries, **Then** only tenants with status = active are shown; pagination resets to page 1.
3. **Given** the user selects "Inactive" from the status filter, **When** the table re-queries, **Then** only tenants with status = inactive are shown.
4. **Given** the user selects "All" from the status filter, **When** the table re-queries, **Then** every tenant (in the user's scope) is shown regardless of status.
5. **Given** the user clears the search input, **When** the input becomes empty, **Then** the search filter is removed and the full (status-filtered) list returns.

---

### Edge Cases

- **Deactivated tenant in the TopBar selector**: If a tenant is set to `status = inactive`, it is excluded from the TopBar tenant selector for Admins and Guards (they cannot "switch into" a deactivated community for day-to-day work). SuperAdmins still see inactive tenants in their selector (so that they can manage/re-activate them) and in the catalog table regardless of the status filter when set to "All".
- **Active tenant becomes deactivated**: If the user's currently active tenant is deactivated mid-session by a SuperAdmin, the app detects the change on the next token refresh (or on the next response carrying the up-to-date set), the selector stops offering that tenant, and the active tenant falls back to the first remaining entry in `tenant_ids` (the one marked primary if still valid, else the first). Tenant-scoped caches are invalidated.
- **User removed from a tenant mid-session**: If a SuperAdmin removes a user's `user_tenants` row while that user is the currently-active tenant, the next authenticated request returns 403; the client recovers by refreshing the token, re-reading the new `tenant_ids`, and falling back to the first remaining tenant. If the user had only one tenant and it was removed, they are signed out (nothing to fall back to).
- **Admin creates the very first tenant of their session (from zero)**: Not possible — every admin is created with at least one assigned tenant (validation at user creation). If this somehow happens (e.g., all their tenants are deleted), they are treated as a user with no tenant and cannot access tenant-scoped endpoints until reassigned.
- **Primary tenant removed**: When an Admin/Guard is edited and their primary tenant is removed, the form is rejected with a validation error — a primary tenant must be selected at all times. Primary cannot be simultaneously removed and reassigned in one save.
- **Tenant name collision**: The tenants table uses `slug` as the unique identifier (already indexed unique). Two tenants can have the same display name; the slug (auto-generated from name or taken from an input) disambiguates them in URLs. Name collisions are allowed.
- **Tenant created with address "—" or null equivalents**: Address is required and must be non-empty whitespace-stripped text. A field containing only whitespace fails validation.
- **Switching tenants while an in-flight mutation is pending**: The switch updates `activeTenantId` optimistically; the in-flight mutation completes against its original tenant (React Query does not abort mid-request). After the switch, new mutations use the new tenant.
- **SuperAdmin without any `user_tenants` rows**: Expected and correct — SuperAdmins are not expected to have join-table rows. The `tenant_ids` claim is the wildcard `"*"`, and the selector is populated from `GET /api/tenants`.
- **Resident manually added to `user_tenants`**: Such rows are ignored by the API and by the JWT hook. Residents are strictly single-tenant and are always scoped via `profiles.tenant_id`, never via `user_tenants`.
- **Concurrent creates by the same Admin**: Two simultaneous "Create Tenant" requests by the same Admin result in two distinct tenants, two `user_tenants` rows, and no unique-constraint collisions (slug is auto-generated with sufficient entropy, or the API returns a 409 on collision and the user retries).
- **Inactive tenant's data still visible to SuperAdmins**: Deactivating a tenant does not destroy its data. SuperAdmins can still read the tenant's records; Admins and Guards assigned to it cannot switch into it (so effectively cannot operate on it). Re-activation restores Admin/Guard operations.

## Clarifications

### Session 2026-04-22

- Q: How should the tenant image be stored? → A: Supabase Storage public-read bucket (DB stores the object path; no signed URLs needed)
- Q: What renders when a tenant has no image (null)? → A: Initials on a deterministic color hashed from the tenant's slug (same fallback in the catalog list and the TopBar selector)
- Q: What file types and size cap apply to the image upload? → A: JPEG, PNG, and WebP only; 2 MB maximum per file
- Q: What upload UX does the Create/Edit Sheet provide? → A: Simple file picker with preview (no client-side cropper); thumbnails use CSS `object-fit: cover`; user may remove (back to null) or replace
- Q: Who can set or change a tenant's image? → A: SuperAdmin on any tenant; Admin only on their assigned tenants (mirrors name/address per FR-014, NOT the SuperAdmin-only rule for status)

## Requirements

### Functional Requirements

#### Navigation & Access

- **FR-001**: The catalog MUST be exposed at `/catalogs/tenants` for users with role `super_admin` or `admin` only. Users with role `guard` or `resident` MUST NOT see the menu entry and MUST NOT reach the page (client-side redirect AND server-side 403 on the API).
- **FR-002**: SuperAdmin MUST see every tenant in the system on the catalog page. Admin MUST see only tenants they are assigned to (per `user_tenants`).
- **FR-003**: The catalog page MUST use the existing authenticated portal shell (TopBar + Sidebar) and appear under the "Catalogs" section of the primary navigation with a translated label.

#### Tenants Table

- **FR-004**: The catalog MUST render a paginated table with columns: Name (from `tenants.name`), Address (from `tenants.address`), Status (translated badge — active/inactive, from `tenants.status`), Created (localized from `tenants.created_at`), and Actions (edit button conditionally rendered by role/assignment).
- **FR-005**: The default page size MUST be 25. Users MUST be able to choose among page sizes 10, 25, 50, 100. Pagination MUST be server-side and return `{ data, total, page, page_size }`.
- **FR-006**: Rows MUST be sorted by `tenants.created_at` descending by default. No user-configurable sort is required in this MVP.
- **FR-007**: The table MUST expose a search input (searches name and address substrings, case-insensitive, 300 ms debounce, server-side) and a status filter with options Active / Inactive / All (default Active).
- **FR-008**: Changing any filter or search query MUST reset pagination to page 1.
- **FR-009**: When zero rows match, the table area MUST display a centered, translated "No records found" message.

#### Create / Edit Sheet

- **FR-010**: Creating and editing a tenant MUST use a right-side Sheet (per the repo-wide UI rule for catalogs — no dedicated `/new` or `/[id]/edit` routes).
- **FR-011**: The Sheet MUST contain the following fields: Name (text, required, max 255 chars, trimmed), Address (text, required, non-empty trimmed), Status (toggle; defaults to Active on create), Image (optional file upload; see FR-011a–FR-011d). The Config field MUST NOT be rendered in the UI but MUST be allowed to persist and default to an empty object.
- **FR-011a**: The image field MUST render as a native file picker (`<input type="file" accept="image/jpeg,image/png,image/webp">`) with an inline live preview. In edit mode the preview MUST show the tenant's current image on open; after a user selects a new file, the preview MUST update to the new file's in-memory data URL until submit/cancel. No client-side cropper is used.
- **FR-011b**: When an image is already associated with the tenant (edit mode), the field MUST offer a visible **Remove** action that, on save, clears `image_path` to null; and a **Replace** action that re-opens the file picker. Clicking Remove MUST NOT delete the stored object until the parent form is successfully saved — cancelling the Sheet MUST leave the image unchanged.
- **FR-011c**: The thumbnail rendered in the catalog list (FR-018a) and the TopBar selector (FR-018b) MUST apply CSS `object-fit: cover` so that non-square uploads display as a centered crop in the fixed-size avatar slot. No server-side cropping or resizing is performed — the stored object is whatever the user uploaded (subject to FR-035c / FR-035d).
- **FR-011d**: The upload MUST be routed through the NestJS API (Constitution Principle VIII — no direct frontend Supabase Storage writes). The API is responsible for writing the object to the tenant-images bucket, persisting the resulting `image_path` on the tenant row, and deleting the previous object when the image is replaced or removed (best-effort; leaving orphans is acceptable for v1 and MUST be tracked as a known limitation).
- **FR-012**: On create, SuperAdmin and Admin MAY submit; Admin MUST be auto-assigned to the new tenant via a `user_tenants` row with `assigned_by = <creating user id>` inserted in the same transaction as the tenant create.
- **FR-013**: On create by an Admin, the API MUST include a `// TODO: enforce tenant limit per admin based on subscription tier` code comment at the check site. No runtime check is performed in v1.
- **FR-014**: On edit, SuperAdmin MAY update any tenant; Admin MAY update only tenants in their `tenant_ids`. A PATCH targeting a non-assigned tenant MUST return HTTP 403 for Admins.
- **FR-015**: Only SuperAdmin MAY change the `status` field on edit. Admin's edit Sheet MUST either hide the Status toggle or render it disabled with a tooltip. A PATCH carrying a status change from an Admin token MUST be rejected (422/403 — the API ignores the field or rejects outright).
- **FR-015a**: Authorization to set, change, or remove the **image** MUST follow the name/address rule (FR-014), NOT the status rule (FR-015). SuperAdmin MAY set the image on any tenant. Admin MAY set the image only on tenants in their `tenant_ids`. A PATCH carrying an image change (file upload or explicit clear-to-null) from an Admin token for a tenant outside their assigned set MUST return HTTP 403. Guards and Residents MUST NEVER be authorized to change the image (API rejects with 403; UI affordances are not rendered).
- **FR-016**: The Sheet MUST gate its fetch for edit mode on the pattern `enabled: Boolean(open && mode === "edit" && tenantId)` so that no data is fetched until the Sheet is open.
- **FR-017**: Sheet width MUST follow the repo convention `w-[400px] sm:w-[800px] sm:max-w-[800px] overflow-y-auto`.
- **FR-018**: On successful create/edit, the Sheet MUST close, a translated success toast MUST appear, and the catalog list MUST be invalidated and re-fetched via React Query.

#### Tenant Image: UI Rendering

- **FR-018a**: The catalog list MUST render the tenant's image as a small thumbnail (avatar-style) rendered alongside the Name column — visible on every row without requiring the user to open the row.
- **FR-018b**: The TopBar Tenant Selector MUST render the same thumbnail next to each option in the dropdown AND next to the currently-active tenant on the selector trigger. The thumbnail visible on the trigger reflects `activeTenantId`.
- **FR-018c**: When a tenant's image reference is null, the thumbnail MUST render a deterministic fallback: the tenant's initials (first 1–2 letters of `name`, uppercased) placed on a background color hashed from `tenants.slug`. The same slug MUST produce the same color in every surface (catalog list, selector options, selector trigger) and across all clients, so a given tenant looks the same everywhere.
- **FR-018d**: The thumbnail component (image + fallback) MUST be a single reusable primitive shared by the catalog list and the selector. The implementation package (e.g., `@ramcar/ui` or `@ramcar/features`) is a plan-phase decision; the requirement is single-source, not per-surface duplication.

- **FR-019**: A new join table MUST link users (admin/guard only) to tenants with columns: `id` (uuid pk), `user_id` (uuid fk to `auth.users`), `tenant_id` (uuid fk to `tenants`), `assigned_by` (uuid fk to `auth.users`), `created_at` (timestamptz default now). A unique constraint MUST exist on `(user_id, tenant_id)`.
- **FR-020**: ON DELETE CASCADE MUST apply to both `user_id` and `tenant_id` foreign keys so that deleting a user or a tenant cleans up its join rows automatically.
- **FR-021**: The join table MUST have RLS enabled. Policies MUST allow a SuperAdmin to select/insert/delete any row, and allow Admins to select their own assignments and insert rows for guards they are creating within their assigned tenants. Guards and Residents MUST have no direct read/write access.
- **FR-022**: A data migration MUST seed `user_tenants` rows for every existing profile with role `admin` or `guard` and a non-null `tenant_id`, inserting one row per (user_id, tenant_id) with `assigned_by = user_id` (the user is recorded as their own assigner for legacy rows; a migration marker comment MUST document this convention).
- **FR-023**: Admin and Guard access scoping is driven exclusively by `user_tenants`. SuperAdmin scoping is driven by role (implicit wildcard). Resident scoping is driven exclusively by `profiles.tenant_id`. No mixing.

#### JWT Claims and Auth Hook

- **FR-024**: A Supabase Auth custom access token hook MUST augment the issued JWT with two custom claims: `role` (string) and `tenant_ids` (JSON value).
- **FR-025**: For role `super_admin`, `tenant_ids` MUST be the literal string `"*"` (wildcard).
- **FR-026**: For roles `admin` and `guard`, `tenant_ids` MUST be an array of UUIDs sourced from `user_tenants.tenant_id` where `user_id = <current user>`. Empty array is permitted (e.g., after all assignments are revoked) and MUST cause the API to treat the user as having no tenant scope until reassigned.
- **FR-027**: For role `resident`, `tenant_ids` MUST be a one-element array containing `profiles.tenant_id` for that user.
- **FR-028**: The auth hook MUST NOT query `user_tenants` for residents and MUST NOT query `profiles.tenant_id` for admins/guards in the `tenant_ids` computation (each role's source is strictly defined).

#### API Layer: Scoping Decorator and Guard

- **FR-029**: The existing `@CurrentTenant()` decorator MUST be updated to return, depending on the caller's role: (a) a single `tenant_id` string for residents, (b) a string array `tenant_ids` for admins and guards, (c) the literal `'*'` sentinel for super_admins. All callers MUST be updated to handle the new return shape.
- **FR-030**: A new `@CurrentTenantGuard()` (or update to the existing `TenantGuard`) MUST validate that any incoming `tenant_id` query parameter, route parameter, or request body value is within the caller's `tenant_ids` set. A mismatch MUST produce HTTP 403. For super_admins (`'*'`), the guard MUST NOT reject any tenant target.
- **FR-031**: All existing repository queries that currently filter by a single `tenant_id` MUST be updated to accept either a single id (residents), an array (admins/guards), or a wildcard (super_admins), and MUST scope query predicates accordingly (`WHERE tenant_id = $1` for single, `WHERE tenant_id = ANY($1)` for array, no predicate for wildcard). No query MUST remain unscoped post-migration.
- **FR-032**: New endpoints under `/api/tenants`:
  - `GET /api/tenants` — list (SuperAdmin: all; Admin: their assigned tenants). Supports `search`, `status`, `page`, `page_size` query params.
  - `POST /api/tenants` — create (SuperAdmin or Admin). Admin creates auto-insert a `user_tenants` row.
  - `PATCH /api/tenants/:id` — update (SuperAdmin any; Admin only assigned). Status change reserved to SuperAdmin.
- **FR-033**: All three `/api/tenants` endpoints MUST be protected by `JwtAuthGuard` + `RolesGuard` (roles: `super_admin`, `admin`). Guard and Resident MUST receive HTTP 403.

#### Database Schema: Tenants Table Extensions

- **FR-034**: The `tenants` table MUST be extended with columns: `address text not null default ''` (backfilled to empty for existing rows, then the default dropped via follow-up migration — or made nullable temporarily during migration and tightened after backfill), `status text not null check (status in ('active','inactive')) default 'active'`, `config jsonb not null default '{}'`. The existing `name`, `slug`, `created_at`, `updated_at`, `time_zone` columns are preserved.
- **FR-035**: Existing tenants after migration MUST default to `status = 'active'` and `address = ''` (empty); the application MUST gracefully render an empty address as an em-dash placeholder in the table. SuperAdmin is expected to backfill real addresses post-deploy.

#### Tenant Image: Schema and Storage

- **FR-035a**: The `tenants` table MUST include an optional image reference column (proposed `image_path text null` — exact name finalized at plan time) that stores the object path inside a Supabase Storage bucket dedicated to tenant images. A null value means the tenant has no custom image; existing rows migrate with null and the migration MUST NOT backfill any placeholder path.
- **FR-035b**: A Supabase Storage bucket dedicated to tenant images MUST be configured as **public-read** so browsers can render `<img src="…">` directly from the bucket's public URL with no signed-URL exchange. Write access to the bucket MUST be restricted via bucket/storage policies that mirror `PATCH /api/tenants/:id` authorization (SuperAdmin: any tenant; Admin: only their assigned tenants).
- **FR-035c**: The upload path (frontend pre-check AND API/bucket enforcement) MUST accept only the following MIME types: `image/jpeg`, `image/png`, `image/webp`. All other formats — including SVG, GIF (animated or static), HEIC, BMP, TIFF — MUST be rejected with a translated, specific error message. Validation MUST be enforced at both layers; a frontend bypass MUST NOT result in a persisted file of a rejected type.
- **FR-035d**: Uploaded image files MUST be **≤ 2 MB** (2,097,152 bytes). Files exceeding the limit MUST be rejected at both the frontend (pre-upload size check with a translated error) and the API/bucket (hard size-limit enforcement). The 2 MB cap MUST also be reflected in Supabase Storage bucket configuration so the bucket itself refuses oversize uploads as a last line of defense.

#### Database: RLS Policy Updates for Tenant-Scoped Tables

- **FR-036**: Every existing RLS policy that filters by `tenant_id` on a tenant-scoped table MUST be updated to handle three branches:
  - SuperAdmin: unrestricted select/mutate.
  - Admin / Guard: allowed only when `tenant_id IN (SELECT ut.tenant_id FROM user_tenants ut WHERE ut.user_id = auth.uid())`.
  - Resident: allowed only when `tenant_id = (SELECT p.tenant_id FROM profiles p WHERE p.user_id = auth.uid())`.
- **FR-037**: The tenant-scoped tables to update are at minimum: `profiles`, `access_events`, `vehicles`, `visit_persons`, `visit_person_images`. Any other tenant-scoped table present at deploy time (e.g., if added between spec and implementation) MUST also be migrated — the implementation phase MUST enumerate the set at plan time.
- **FR-038**: The `tenants` table itself MUST have an updated RLS select policy allowing SuperAdmin all rows, Admin their assigned rows, and Guard their assigned rows (guards need select access so the TopBar selector can populate). Residents MAY select only their own tenant row.

#### Frontend: Zustand Auth Slice

- **FR-039**: The auth slice in `@ramcar/store` MUST replace the previous single `tenantId: string` / `tenantName: string` fields with: `tenantIds: string[]` (all assigned tenants), `activeTenantId: string` (currently selected tenant), `activeTenantName: string` (currently selected tenant name). A SuperAdmin's `tenantIds` MUST be the full list of tenants returned by `GET /api/tenants` (not the wildcard string — that sentinel stays server-side only).
- **FR-040**: On login, `activeTenantId` MUST default to `profiles.tenant_id` (the user's primary tenant) when that id is present in `tenantIds`; otherwise to the first element of `tenantIds`; otherwise to empty string (user has no tenant).
- **FR-041**: `activeTenantId` MUST persist across page reloads within a session (localStorage or an equivalent durable mechanism). On next sign-in (new session), the default from FR-040 applies.

#### Frontend: TopBar Tenant Selector

- **FR-042**: A TenantSelector component MUST be rendered in the TopBar between the tenant name display and the theme toggle. The component MUST be a shared primitive reachable by both `apps/web` and `apps/desktop` (either in `packages/ui` or in shared feature code — see Assumptions).
- **FR-043**: The TenantSelector MUST render ONLY when the current user has 2 or more tenants in `tenantIds`. For users with exactly one tenant, the selector MUST return null.
- **FR-044**: The selector trigger MUST display the current `activeTenantName` and a chevron icon. Clicking it MUST open a shadcn Popover containing a Command (combobox) with a search input and a list of the user's tenants.
- **FR-045**: The active tenant MUST be visibly marked in the list (checkmark). The search input MUST filter the list by tenant name substring.
- **FR-046**: For SuperAdmin, the tenant list source MUST be `GET /api/tenants` (all tenants). For Admin and Guard, the source MUST be a tenant lookup scoped to their `tenant_ids` (subset endpoint or filter from the full list — implementation decision, see Assumptions).
- **FR-047**: Inactive tenants MUST be excluded from the selector for Admin and Guard. SuperAdmin MAY see inactive tenants (or a clear "Inactive" marker); the implementation SHOULD include inactive tenants for SuperAdmin so they can switch into a tenant to reactivate it.
- **FR-048**: Selecting a tenant MUST: (a) update `activeTenantId` and `activeTenantName` in the Zustand auth slice, (b) trigger React Query invalidation for every tenant-scoped query key (simplest correct approach: `queryClient.invalidateQueries()` with no predicate, or a predicate matching keys that include `tenantId`), (c) NOT perform a browser reload, (d) close the popover.
- **FR-049**: Residents MUST NEVER see the selector regardless of any database inconsistency (they are strictly single-tenant per FR-027).

#### Frontend: Users Form Multi-Tenant Select

- **FR-050**: The existing Users catalog form (for both create and edit flows) MUST, when the selected role is `admin` or `guard`, render a multi-select combobox for tenant assignment. When the role is `resident`, the current single dropdown MUST be preserved.
- **FR-051**: The multi-select MUST reuse the searchable-select pattern established for the resident selector in spec 018 (combobox with debounced search, chips for selected values).
- **FR-052**: Exactly one selected tenant MUST be marked as the primary. The primary defaults to the first tenant added; the user MAY change the primary via a UI affordance (radio button within each chip, or a "Set primary" action on hover).
- **FR-053**: On submit, the API MUST (a) set `profiles.tenant_id` to the primary tenant id, (b) synchronize `user_tenants` rows to exactly match the selected set (insert new rows for additions, delete rows for removals, leave existing rows untouched), (c) record `assigned_by` = creating/editing user id on inserts.
- **FR-054**: A form state with zero tenants selected (for admin/guard role) MUST be invalid — submission is blocked with a translated inline error.
- **FR-055**: An Admin editing or creating a guard user MUST see only their own assigned tenants in the multi-select — they cannot assign a guard to a tenant they themselves do not belong to. A PATCH/POST attempting to do so MUST be rejected with HTTP 403 at the API.
- **FR-056**: An Admin MUST NOT be able to create users with role `admin` (the role picker does not offer it, and the API rejects the request if one is constructed manually).

#### Internationalization

- **FR-057**: All user-visible strings in the catalog, the sheet, the form changes, and the tenant selector — including column headers, filter labels, placeholders, validation errors, empty state, toast messages, badge labels — MUST be sourced from the shared translation catalog (`@ramcar/i18n`). No hardcoded strings.

#### Performance envelope

- **FR-058**: The catalog table's default view (page size 25, status = Active, no search) MUST render within 1 second under normal load after the user navigates to `/catalogs/tenants`.
- **FR-059**: Switching tenants via the selector MUST reflect the new tenant's data in the visible page within 1 second under normal load, excluding network latency (measured as: time from selection commit to the first render with new-tenant data).
- **FR-060**: The JWT claim `tenant_ids` MUST be sized such that a user assigned to up to 50 tenants does not exceed Supabase's JWT size limits. If a user's assignments exceed a safe threshold, the auth hook MUST fall back to a server-side lookup signal — but this is an edge case flagged for monitoring, not an in-scope feature.

### Key Entities

- **Tenant**: A residential community (fraccionamiento) managed by the platform. New or newly-enforced attributes for this feature: `name` (existing), `slug` (existing), `address` (new, required for display), `status` (new, enum active/inactive, controls whether the tenant is selectable by non-SuperAdmin users), `config` (new JSONB, reserved for future feature flags, not surfaced in the UI), `image_path` (new, optional, references an object in a Supabase Storage public-read bucket; used for quick visual differentiation in the catalog list and the TopBar tenant selector), `time_zone` (existing from spec 019). Relationships: one tenant has many profiles; one tenant has many user_tenants rows; one tenant contains many tenant-scoped entities (access_events, visit_persons, vehicles, etc.).
- **Profile (User)**: The authenticated person. Existing attributes preserved. `tenant_id` retains its role as the user's *primary* tenant (for residents, it's the only tenant; for admins/guards, it's a tiebreaker when the multi-tenant set has a preferred/default). The `role` column controls how the JWT hook computes `tenant_ids`.
- **UserTenant (new)**: The join row linking a profile to a tenant for multi-tenant admin/guard scoping. Key attributes: `user_id`, `tenant_id`, `assigned_by`, `created_at`. Unique on `(user_id, tenant_id)`. Never populated for residents. Populated for SuperAdmins is allowed but ignored (SuperAdmin scope comes from role, not the join).

### Data Access Architecture

| Operation | API Endpoint | HTTP Method | Request DTO | Response DTO |
|-----------|--------------|-------------|-------------|--------------|
| List tenants (catalog) | GET `/api/tenants` | GET | `TenantListQueryDto` (search, status, page, page_size) | `PaginatedResponse<Tenant>` |
| Get one tenant (edit prefill) | GET `/api/tenants/:id` | GET | route param | `Tenant` |
| Create tenant | POST `/api/tenants` | POST | `CreateTenantDto` (name, address, status, config?) | `Tenant` |
| Update tenant | PATCH `/api/tenants/:id` | PATCH | `UpdateTenantDto` (name?, address?, status?, config?) | `Tenant` |
| Upload tenant image | POST `/api/tenants/:id/image` (multipart) | POST | `multipart/form-data` with single `file` field (JPEG/PNG/WebP, ≤ 2 MB) | `Tenant` (with refreshed `image_path`) |
| Clear tenant image | DELETE `/api/tenants/:id/image` | DELETE | route param only | `Tenant` (with `image_path = null`) |
| List tenants for selector (caller-scoped) | GET `/api/tenants` with `scope=assigned` (or reuse list endpoint) | GET | `TenantListQueryDto` | `PaginatedResponse<Tenant>` |
| List users (existing) | GET `/api/users` | GET | existing DTO | existing response |
| Create user (existing, updated) | POST `/api/users` | POST | `CreateUserDto` extended with `tenant_ids: string[]` and `primary_tenant_id: string` for admin/guard | `User` |
| Update user (existing, updated) | PATCH `/api/users/:id` | PATCH | `UpdateUserDto` extended as above | `User` |

**Validation**: All new DTOs MUST be defined as Zod schemas in `@ramcar/shared` and reused by both NestJS request validation and frontend form validation (Constitution Principle V).

**Frontend data flow**: TanStack Query → NestJS API → Repository → Supabase/Postgres. The frontend MUST NOT call Supabase `.from()`, `.rpc()`, or `.storage` directly for any catalog operation, user creation change, or tenant selector data (Constitution Principle VIII).

**Allowed frontend Supabase usage**: Authentication (`supabase.auth.*`) and Realtime (`supabase.channel()`) only. Realtime is not used by this feature.

**Tenant scoping**:
- `/api/tenants` list: SuperAdmin returns all; Admin returns only tenants in their `tenant_ids`.
- `/api/tenants/:id` PATCH: validated via updated `TenantGuard` against the caller's `tenant_ids` (SuperAdmin exempt).
- All existing tenant-scoped endpoints (`/api/access-events`, `/api/visit-persons`, `/api/residents`, `/api/users`, `/api/vehicles`, …) MUST be migrated to the new array/wildcard scoping rules in FR-031.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A SuperAdmin can create a new tenant from scratch (open catalog → click create → fill two fields → save) in under 30 seconds, starting from the dashboard.
- **SC-002**: An Admin who manages three communities can switch between them via the TopBar selector in under 3 seconds per switch, measured from click-to-open to first frame of new-tenant data rendered.
- **SC-003**: In a controlled access-control audit (scripted requests with mismatched `tenant_id` values, non-authorized roles, and replayed tokens), cross-tenant row leakage is zero, and 100% of Guard/Resident requests to `/api/tenants` are denied with HTTP 403.
- **SC-004**: After the migration is applied, every pre-existing admin/guard user retains access to their previously-single tenant with no manual intervention (100% parity), verifiable by diff of `user_tenants` row count against the pre-migration `profiles` count filtered to those two roles.
- **SC-005**: First-time guards assigned to two communities successfully switch to the correct tenant on their first attempt (observed in usability smoke tests), without needing training.
- **SC-006**: Zero user-visible strings in the catalog, sheet, form changes, and selector are untranslated in either supported locale (Spanish and English).
- **SC-007**: The catalog table's initial view loads within 1 second at the p95 under normal load, and search/filter changes produce new results within 1 second at the p95 after the 300 ms debounce elapses.
- **SC-008**: No existing tenant-scoped feature (Logbook, Access Log, Users catalog, Visitors/Providers, Vehicles) regresses in row visibility for Residents — audited by cross-checking row counts in each subpage for representative resident accounts before and after deploy.
- **SC-009**: An Admin who creates a new tenant is assigned to it and can switch into it via the TopBar selector (after token refresh) in the same session, without needing to sign out and back in, within 10 seconds total.

## Assumptions

The following decisions were taken from the feature prompt, the existing codebase, and industry defaults. They are not flagged for clarification but are documented so that downstream planning and review can confirm or challenge them.

- **`profiles` replaces `users` in the prompt's SQL**: The feature prompt writes `REFERENCES users(id)`; the actual schema has an `auth.users` (Supabase Auth) table and a `public.profiles` table. All `user_id` references throughout this feature map to `auth.users(id)` (or `profiles.user_id` where the join hops through the profile). The migration phase will finalize the exact references; this spec treats the two names as equivalent for purposes of intent.
- **`tenants` needs three new columns (`address`, `status`, `config`)**: The current schema has only `name`, `slug`, `created_at`, `updated_at`, `time_zone`. The migration must ADD these columns with safe defaults (`address = ''`, `status = 'active'`, `config = '{}'::jsonb`) so existing rows remain valid.
- **`config` JSONB is reserved and not rendered in v1**: The field exists to unblock future feature-flag work without another migration. The create/edit Sheet does not expose it; the API accepts/returns it as-is (default empty object).
- **Primary tenant auto-selected; user may override**: When an admin/guard user is being edited in the Users form and has multiple tenants selected, one is always marked primary. Default is the first selected; the user can change which is primary via an inline radio or "Set primary" action on each chip. This matches the prompt's intent ("one of the selected tenants should be marked as the 'primary' tenant").
- **Inactive tenants are hidden from Admin/Guard selectors, visible to SuperAdmin**: Deactivation is the mechanism for temporarily taking a community offline. SuperAdmins retain visibility for maintenance; Admins and Guards lose the ability to operate on the community while it's inactive. Residents are unaffected (they are tied to a single tenant by `profiles.tenant_id`, not by the selector).
- **`@CurrentTenant()` return shape changes**: This is a breaking change to the decorator's TypeScript contract. Every existing caller in `apps/api` MUST be migrated in the same PR. No shim or backwards-compatible overload is planned (clean cutover).
- **RLS migration enumerates tenant-scoped tables at plan time**: The current spec lists the known set (`profiles`, `access_events`, `vehicles`, `visit_persons`, `visit_person_images`). The prompt also names `blacklist`, `amenities`, `reservations`, `patrol_rounds`, `announcements`, `projects`, `complaints`, `lost_and_found`, `wifi_networks`, `activity_logs` — none of which exist in the current migrations. Those are future tables and will inherit the updated RLS pattern when they are created. The plan phase MUST re-enumerate against the actual schema at that time.
- **Seeding `user_tenants` for existing admins/guards uses `assigned_by = user_id`**: Legacy rows have no recorded assigner; recording the user as their own assigner is a clear sentinel that disambiguates legacy from post-migration rows. A SQL comment documents this in the migration.
- **JWT `tenant_ids` claim is the single source of truth at the API boundary**: The API does not re-query `user_tenants` on every request (cost) — it trusts the claim. If the claim must be invalidated (e.g., a user is removed from a tenant), the user's token is refreshed on its normal TTL and the updated claim propagates. Out-of-band invalidation (force-logout) is out of scope.
- **SuperAdmin `tenant_ids` claim is the wildcard string `"*"`**: This matches the prompt. Server-side code treats `"*"` as bypass; client-side code (Zustand) stores the concrete array returned by `GET /api/tenants`. The wildcard never reaches the front end.
- **Tenant selector source endpoint**: The selector calls `GET /api/tenants` (already role-scoped: SuperAdmin gets all, Admin/Guard gets their assigned set). No dedicated "selector" endpoint is introduced — the same list endpoint powers both the catalog table (paginated) and the selector (request with a larger page size or a distinct `scope=selector` param). Final shape is a plan-phase decision.
- **Guard sees the selector if they are assigned to 2+ tenants**: Guards are not supposed to reach `/catalogs/tenants` (catalog access is Admin/SuperAdmin only) but they DO see the TopBar selector because they may rotate between communities. The selector list is populated from their `tenant_ids` (via `GET /api/tenants` scoped to their assigned set, excluding inactive).
- **Cross-app sharing of the selector component**: The TenantSelector is a strong candidate for `packages/features` (alongside `visitors` per spec 014) OR `packages/ui` as a primitive. Because it depends on the auth slice from `@ramcar/store` and on a transport-agnostic list call, it fits the shared-feature-module pattern (with injected transport and i18n adapters). The plan phase will finalize the package placement; the spec requires only that both apps render the same component.
- **Token refresh after Admin creates a new tenant**: The Admin's new `user_tenants` row is not visible in their JWT until the token is refreshed. The client library (`@supabase/ssr` or the desktop auth client) handles refresh on its normal schedule (short-lived access tokens). The spec does not require a forced refresh; the TopBar selector picks up the new tenant at most one token-TTL later. Optional UX: show an info toast after create ("This tenant will appear in your selector shortly") — planning decision.
- **No tenant deletion endpoint in v1**: Deleting a tenant is out of scope. Admins and SuperAdmins can only soft-deactivate via the `status` toggle. Hard delete is deferred.
- **No bulk tenant import in v1**: Tenants are created one at a time via the Sheet.
- **Slug generation**: The `tenants.slug` column is already unique and required. On create, the API MUST auto-generate a URL-safe slug from the submitted name (e.g., lowercase, hyphen-separated, ASCII-folded), appending a short disambiguator if the slug already exists. The create Sheet does NOT expose a slug field to the user.
- **Tenant image storage**: A new Supabase Storage **public-read** bucket (proposed `tenant-images`; final name is a plan-phase decision) holds tenant image objects. Public is safe because tenant logos are non-sensitive visual identity — not PII like `visit_person_images`. Public access avoids signed-URL refresh overhead in the TopBar tenant selector, which re-renders on every page. Write access is policy-restricted to match the PATCH authorization rules (SuperAdmin any tenant; Admin assigned tenants only).

## Out of Scope

- Hard-deleting tenants (soft-deactivation via `status` is the only v1 mechanism).
- Enforcing a maximum number of tenants per Admin (subscription-tier limit) — left as a TODO in the code at the create-tenant site. No runtime behavior in v1.
- Bulk import or CSV upload of tenants.
- Tenant-level configuration UI for `config` JSONB (column exists but is not surfaced in the Sheet).
- Audit log for tenant creation/update/assignment changes beyond existing activity tracking.
- Tenant theming, branding, or per-tenant visual customization.
- Transferring ownership of a tenant between Admins via a dedicated UI (Admins can be added/removed via the Users form's multi-select).
- A dedicated "Switch-tenant" keyboard shortcut in the UI (the selector is mouse/touch only in v1).
- Real-time (Realtime subscription) updates to the tenant catalog or the selector list. Reads are on-demand and invalidation is query-triggered.
- Migrating the existing `@CurrentTenant` decorator in a backwards-compatible way (the decorator contract changes in a single PR alongside every caller — no shim).
- Scoping by tenant ownership group or multi-organization hierarchies (outside the current data model).
- Force-logout on revocation of a `user_tenants` row (out-of-band session invalidation is not implemented; the user's claim refreshes on normal TTL).
