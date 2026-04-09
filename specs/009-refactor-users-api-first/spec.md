# Feature Specification: Catalog Users — API-First Refactor

**Feature Branch**: `009-refactor-users-api-first`  
**Created**: 2026-04-09  
**Status**: Draft  
**Input**: User description: "Revisit, refactor and reimplement the Catalog Users feature enforcing API-first data access. Remove all frontend Server Actions that use direct Supabase database queries. Wire frontend to existing NestJS API endpoints via TanStack Query. Enforce Constitution Principle VIII."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View and Search Users List via API (Priority: P1)

A Super Admin or Admin navigates to Catalogs > Users and sees a paginated, searchable, sortable table of users. All data is fetched from the NestJS API (`GET /users`) via TanStack Query — no direct Supabase database access occurs. The page loads seamlessly with loading states, caching, and background refetch handled by TanStack Query.

**Why this priority**: The user list is the foundation of user management and the primary read path. Refactoring this from Server Actions to API-backed TanStack Query hooks establishes the core data-fetching pattern that all other operations will follow.

**Independent Test**: Navigate to Catalogs > Users. Verify the table loads data from the NestJS API endpoint (network tab shows `GET /api/users`), supports search/filter/sort, and no `supabase.from()` calls exist in the frontend code path.

**Acceptance Scenarios**:

1. **Given** a Super Admin is logged in, **When** they navigate to Catalogs > Users, **Then** the page fetches users from `GET /api/users` (not from a Server Action or direct Supabase query) and displays them in a paginated table.
2. **Given** the Users list is displayed, **When** the user types "guard" into the search box, **Then** a new API request is made with the search parameter and filtered results are displayed.
3. **Given** the Users list is displayed, **When** the user selects a tenant filter, **Then** the API is called with the tenant filter and only matching users are shown.
4. **Given** the Users list is displayed, **When** the user clicks a column header, **Then** the API is called with updated sort parameters and the list re-renders with sorted results.
5. **Given** an Admin is logged in, **When** they navigate to Catalogs > Users, **Then** the API enforces tenant scoping server-side and only users within the Admin's tenant are returned.
6. **Given** the user list is loading, **When** the API request is in-flight, **Then** a loading skeleton or spinner is displayed. When the request completes, data replaces the loading state.

---

### User Story 2 - Create a New User via API (Priority: P1)

A Super Admin or Admin fills out the create user form and submits. The form includes required fields (full name, address, username, phone, email, role, tenant) and optional fields (password, confirm password, phone type, user groups, observations). The status field is pre-populated to "active". If the admin provides a temporary password, the auth account is created with that password. If the password fields are left blank, a label explains that a password reset link will be sent to the user's email. The form data is sent to the NestJS API (`POST /users`) via a TanStack Query mutation — not through a Server Action. On success, the user list cache is invalidated and the user is redirected.

**Why this priority**: User creation is the primary write operation. Routing it through the API ensures business logic (role restrictions, tenant isolation, uniqueness validation) is enforced server-side in a single location, eliminating the duplicated logic in the former Server Action.

**Independent Test**: Fill out the create user form and submit. Verify the network tab shows `POST /api/users` (not a Server Action call), the API handles all validation, and the users list refreshes automatically via cache invalidation.

**Acceptance Scenarios**:

1. **Given** a Super Admin is on the create user page, **When** they fill in all required fields (full name, address, username, phone, email, role, tenant) and submit, **Then** a `POST /api/users` request is made, the API creates both the auth account and profile record, and the user is redirected to the list with a success notification.
2. **Given** an admin fills in the create form, **When** they provide a temporary password and matching confirm password, **Then** the auth account is created with that password.
3. **Given** an admin fills in the create form, **When** the password and confirm password fields are left blank, **Then** a label is displayed explaining "A password reset link will be sent to the user's email" and the API creates the auth account and triggers the reset link.
4. **Given** an admin fills in the create form, **When** the password and confirm password values do not match, **Then** a client-side validation error is displayed before submission.
5. **Given** an Admin is on the create user page, **When** they submit a user with role "super_admin", **Then** the API rejects the request with a forbidden error (role enforcement happens server-side, not in frontend logic).
6. **Given** any authorized user submits a user with a duplicate email, **When** the API returns a validation error, **Then** the error is displayed in the form without a page reload.
7. **Given** a create mutation is in-flight, **When** the user waits, **Then** the submit button is disabled and shows a loading indicator. On success, the users list TanStack Query cache is invalidated to show the new user.
8. **Given** the create form is opened, **When** the status field is rendered, **Then** it is pre-populated with "active" as the default value.

---

### User Story 3 - Edit an Existing User via API (Priority: P2)

A Super Admin or Admin opens an existing user's edit form. The user's current data is fetched from the NestJS API (`GET /users/:id`) via TanStack Query. The edit form enforces the same required fields as the create form (full name, address, username, phone, email, role, tenant). After editing, the update is sent via `PUT /users/:id`. Role hierarchy enforcement and tenant scoping happen server-side. The edit form does not include password fields — password resets are a separate action.

**Why this priority**: Editing users is essential for maintaining accurate records. Fetching individual user data and submitting updates through the API completes the read-write cycle via the correct data path.

**Independent Test**: Click "Edit" on a user, verify the form loads data from `GET /api/users/:id`. Edit a field, submit, and verify `PUT /api/users/:id` is called. Confirm the users list cache is invalidated on success.

**Acceptance Scenarios**:

1. **Given** a Super Admin clicks "Edit" on a user, **When** the edit page loads, **Then** the user's data is fetched from `GET /api/users/:id` (not a Server Action) and pre-fills the form with all fields including required ones (full name, address, username, phone, email, role, tenant).
2. **Given** an admin edits a user with missing required fields (e.g., address was previously null), **When** they submit, **Then** client-side validation requires them to fill in all required fields before submission.
3. **Given** an Admin edits a user, **When** they change the role to "super_admin" and submit, **Then** the API rejects the request (role hierarchy enforced server-side).
4. **Given** a Super Admin updates a user's role, **When** the update succeeds, **Then** the API updates both the profile and auth JWT metadata, and the users list cache is invalidated.
5. **Given** an Admin views the users list, **When** they see a Super Admin user, **Then** the edit and deactivate controls are disabled based on the `canEdit`/`canDeactivate` flags returned by the API.

---

### User Story 4 - Deactivate/Reactivate a User via API (Priority: P2)

A Super Admin or Admin deactivates or reactivates a user. The status toggle is sent to the NestJS API (`PATCH /users/:id/status`) via a TanStack Query mutation. The confirmation dialog remains in the frontend, but all business logic (self-deactivation prevention, role hierarchy checks) is enforced server-side.

**Why this priority**: Status management is a critical security operation. Ensuring it goes through the API guarantees consistent enforcement of deactivation rules regardless of how the request originates.

**Independent Test**: Click "Deactivate" on a user, confirm in the dialog, and verify `PATCH /api/users/:id/status` is called. Verify the user's status changes in the list via cache invalidation.

**Acceptance Scenarios**:

1. **Given** a Super Admin clicks "Deactivate" on a user, **When** the confirmation dialog is confirmed, **Then** a `PATCH /api/users/:id/status` request is sent with `{ status: "inactive" }` and the users list updates after cache invalidation.
2. **Given** an Admin attempts to deactivate their own account, **When** the API receives the request, **Then** it returns an error (self-deactivation prevention enforced server-side), and the frontend displays the error message.
3. **Given** an inactive user exists, **When** a Super Admin clicks "Reactivate", **Then** the API sets their status to "active" and the list updates.

---

### User Story 5 - Fetch User Groups via API (Priority: P3)

The user groups multi-select on the create/edit form loads its options from the NestJS API (`GET /user-groups`) via TanStack Query. User groups data is cached and shared across form instances.

**Why this priority**: User groups are a supporting data entity used within the user forms. Routing this lookup through the API completes the migration of all data access paths.

**Independent Test**: Open the create or edit user form, verify the user groups dropdown loads data from `GET /api/user-groups` (not a Server Action). Verify TanStack Query caches the result so subsequent form opens don't re-fetch.

**Acceptance Scenarios**:

1. **Given** the create user form is opened, **When** the page renders, **Then** user groups are fetched from `GET /api/user-groups` and displayed in the multi-select.
2. **Given** user groups are already cached from a prior fetch, **When** the edit form is opened, **Then** TanStack Query serves the cached data immediately (no additional API call unless stale).

---

### User Story 6 - Fetch Tenants List via API (Priority: P3)

The tenant selector (used by Super Admins in the user form and list filter) loads tenant options from a NestJS API endpoint via TanStack Query instead of a direct Supabase query.

**Why this priority**: Tenant data is a supporting lookup used in filters and forms. Migrating this to the API completes the elimination of all direct Supabase data access in the users feature.

**Independent Test**: Open the create user form as a Super Admin, verify the tenant dropdown loads data from an API endpoint (not a direct Supabase query).

**Acceptance Scenarios**:

1. **Given** a Super Admin opens the create user form, **When** the form renders, **Then** tenants are fetched from an API endpoint and displayed in the tenant selector.
2. **Given** a Super Admin views the users list, **When** the tenant filter is rendered, **Then** the filter options are fetched from the same API endpoint, with caching.

---

### User Story 7 - Remove All Server Actions and Direct Supabase Data Access (Priority: P1)

All Server Action files in `apps/web/src/features/users/actions/` that use `supabase.from()`, `.rpc()`, or `.storage` are removed. The frontend uses only TanStack Query hooks to call NestJS API endpoints. The only allowed frontend Supabase usage is `supabase.auth.*` (authentication) and `supabase.channel()` (realtime).

**Why this priority**: This is the core architectural change. Without removing the Server Actions, the API-first principle is not enforced and business logic remains duplicated.

**Independent Test**: Grep the entire `apps/web/src/features/users/` directory for `supabase.from(`, `"use server"`, `.rpc(`, and `.storage`. Zero matches confirms the migration is complete. Verify the feature still works end-to-end.

**Acceptance Scenarios**:

1. **Given** the refactor is complete, **When** the `apps/web/src/features/users/actions/` directory is inspected, **Then** no files contain `supabase.from()`, `.rpc()`, or `.storage` calls.
2. **Given** the refactor is complete, **When** the `apps/web/src/features/users/` directory is searched for `"use server"`, **Then** no Server Action files exist for data operations (auth-only Server Actions, if any, are acceptable).
3. **Given** the refactor is complete, **When** the full users CRUD flow is exercised (list, create, edit, deactivate, reactivate), **Then** all operations succeed using only API calls visible in the browser network tab.

---

### Edge Cases

- What happens when the API is unreachable or returns a 500 error? TanStack Query's error handling should display a user-friendly error state with a retry option — no silent failures.
- What happens when a user's JWT expires mid-session? The Supabase auth client refreshes the token automatically; the API call is retried with the fresh token. If refresh fails, the user is redirected to login.
- What happens when two admins edit the same user simultaneously? The API returns the latest state on each fetch; last-write-wins applies. Optimistic updates in TanStack Query should roll back on conflict errors.
- What happens when the users list query cache becomes stale while the user is on the page? TanStack Query's `refetchOnWindowFocus` and `staleTime` settings should provide reasonable freshness without excessive API calls.
- What happens when a Super Admin creates a user for a tenant they don't belong to? The API allows this for Super Admins (no tenant restriction); the frontend tenant selector is only shown for Super Admins.
- What happens if the TanStack Query QueryClientProvider is missing? The app should have a single QueryClientProvider at the layout level so all pages within the dashboard have access.
- What happens when password and confirm password do not match? Client-side validation prevents form submission and displays a mismatch error.
- What happens when an admin edits a user whose address/username/phone was previously null? The edit form enforces required fields — the admin must fill in the missing data before saving.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Frontend MUST fetch all user data exclusively from NestJS API endpoints — no direct Supabase database queries (`supabase.from()`, `.rpc()`, `.storage`) in any frontend code path.
- **FR-002**: Frontend MUST use TanStack Query v5 hooks (`useQuery`, `useMutation`) for all data fetching and mutations against the NestJS API.
- **FR-003**: All existing Server Action files in `apps/web/src/features/users/actions/` that perform database operations MUST be removed and replaced with TanStack Query hooks calling NestJS API endpoints.
- **FR-004**: A shared `QueryClientProvider` MUST be available at the dashboard layout level so all child pages can use TanStack Query hooks.
- **FR-005**: TanStack Query hooks MUST pass the user's JWT token in the `Authorization: Bearer <token>` header on every API request. The token MUST be obtained from `supabase.auth.getSession()`.
- **FR-006**: The users list (`GET /api/users`) MUST support query parameters for pagination (`page`, `pageSize`), search (`search`), sorting (`sortBy`, `sortOrder`), tenant filter (`tenantId`), and status filter (`status`).
- **FR-007**: The create user form MUST have the following required fields: full name, address, username, phone, email, role, and tenant. Optional fields: password, confirm password, phone type, user groups, and observations. The status field MUST be pre-populated to "active".
- **FR-007a**: The create user form MUST include password and confirm password fields. When provided, the API creates the auth account with the given password. When left blank, a visible label MUST explain: "A password reset link will be sent to the user's email."
- **FR-007b**: When both password fields are provided, they MUST match. Client-side validation MUST prevent submission if they do not match.
- **FR-007c**: Both email and username MUST serve as valid login identifiers for the created user.
- **FR-008**: The create user flow MUST use a `useMutation` hook that calls `POST /api/users` and invalidates the users list query cache on success.
- **FR-008a**: The edit user form MUST enforce the same required fields as the create form (full name, address, username, phone, email, role, tenant). The edit form does NOT include password fields.
- **FR-009**: The edit user flow MUST fetch the user via `GET /api/users/:id` and submit updates via `PUT /api/users/:id`, invalidating both the user detail and users list query caches on success.
- **FR-010**: The deactivate/reactivate flow MUST use a `useMutation` hook that calls `PATCH /api/users/:id/status` and invalidates the users list query cache on success.
- **FR-011**: The user groups multi-select MUST fetch options from `GET /api/user-groups` via a `useQuery` hook with appropriate caching (groups change infrequently).
- **FR-012**: The tenants selector MUST fetch options from an API endpoint via a `useQuery` hook (the existing `GET /api/tenants` or equivalent endpoint).
- **FR-013**: Frontend MUST display loading states (skeletons or spinners) while API requests are in-flight and error states with retry capability when requests fail.
- **FR-014**: Frontend MUST disable form submit buttons during mutation in-flight states to prevent duplicate submissions.
- **FR-015**: The allowed frontend Supabase usage is limited to: Authentication (`supabase.auth.*`) for session/token management, and Realtime (`supabase.channel()`, `.on()`) for live updates. Nothing else.
- **FR-016**: TanStack Query cache keys MUST include the tenant context where applicable, following the pattern: `[resource, tenantId, modifier, filters]`.
- **FR-017**: All role-based restrictions (which roles can be assigned, which users can be edited/deactivated) MUST be enforced server-side in the NestJS API. Frontend role restrictions are for UX convenience only — the API is the authority.
- **FR-018**: The NestJS API `POST /users` endpoint MUST accept an optional `password` field. When provided, the auth account is created with that password. When omitted, the API triggers a password reset email to the new user.
- **FR-019**: The `@ramcar/shared` `createUserSchema` and `updateUserSchema` MUST be updated to reflect the new required fields (address, username, phone) and the optional password/confirmPassword fields on create.
- **FR-020**: Feature MUST include unit tests for: TanStack Query hooks (mocked API responses), form components (rendering and validation including password match), and table components (data display and interaction).
- **FR-021**: Feature MUST include end-to-end tests (Playwright) verifying the full CRUD flow works through the API path, including both password-provided and password-omitted creation flows.
- **FR-022**: The database migration and schema (`profiles` table extension, `user_groups` table) MUST remain unchanged from the original 008 feature.

### Key Entities

- **User (Profile)**: Represents a person in the system. Key attributes: full name, email, role, tenant, address, username, phone, phone type, status, user groups, observations. Linked to Supabase auth user via user_id.
- **User Group**: A classification category for users (e.g., "Moroso", "Cumplido"). Key attributes: id, name. Referenced by profiles via user_group_ids.
- **Tenant**: The residential community a user belongs to. Each profile is associated with exactly one tenant.

### Data Access Architecture *(mandatory for features involving data)*

| Operation           | API Endpoint              | HTTP Method | Request DTO                | Response DTO                           |
|---------------------|---------------------------|-------------|----------------------------|----------------------------------------|
| List users          | /api/users                | GET         | UserFiltersDto (query)     | PaginatedResponse\<ExtendedUserProfile\> |
| Get user by ID      | /api/users/:id            | GET         | -                          | ExtendedUserProfile                    |
| Create user         | /api/users                | POST        | CreateUserDto (body, includes optional password) | { success, user }              |
| Update user         | /api/users/:id            | PUT         | UpdateUserDto (body)       | { success, user }                      |
| Toggle user status  | /api/users/:id/status     | PATCH       | { status: string } (body)  | { success, user }                      |
| List user groups    | /api/user-groups          | GET         | -                          | { data: UserGroup[] }                  |
| List tenants        | /api/tenants              | GET         | -                          | Tenant[]                               |

**Frontend data flow**: TanStack Query -> NestJS API -> Repository -> Supabase/Postgres  
**Allowed frontend Supabase usage**: Auth (`supabase.auth.*`) for session/token management and Realtime (`supabase.channel()`) only

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero instances of `supabase.from()`, `.rpc()`, or `.storage` exist in `apps/web/src/features/users/` after refactoring.
- **SC-002**: Zero Server Action files (`"use server"`) for data operations exist in the users feature after refactoring.
- **SC-003**: All seven data operations (list, get, create, update, toggle status, list groups, list tenants) are served exclusively through NestJS API endpoints, verifiable via browser network tab.
- **SC-004**: Authorized users (Admin, Super Admin) can view, search, filter, and sort the users list with results appearing within 2 seconds of interaction.
- **SC-005**: A new user can be created through the form and API flow in under 60 seconds.
- **SC-006**: Role assignment restrictions are enforced 100% of the time by the API — Admin users can never assign admin/super_admin roles regardless of frontend state.
- **SC-007**: TanStack Query cache invalidation ensures the users list reflects create/update/deactivate changes immediately without manual page refresh.
- **SC-008**: All existing functional behavior from the original 008 feature is preserved — no user-visible regressions.

## Clarifications

### Session 2026-04-09

- Q: Are the password fields required or optional on the create user form? → A: Optional — if left blank, the system sends a password reset link via email to the new user.
- Q: Should the edit form enforce the same required fields as the create form? → A: Yes — same required fields on both create and edit forms (full name, address, username, phone, email, role, tenant).

## Assumptions

- The NestJS API endpoints for users (`GET/POST/PUT/PATCH /users`) and user groups (`GET /user-groups`) already exist from the original 008 implementation. The `POST /users` endpoint will be updated to accept an optional `password` field.
- A tenants list endpoint (`GET /api/tenants` or similar) either exists or will need to be added as part of this feature to support the tenant filter/selector.
- The NestJS API is running locally on a known port during development (e.g., `localhost:3001`) with the base URL configured via environment variable.
- TanStack Query v5 is listed as a dependency in `apps/web/package.json` (from the 008 implementation).
- The Supabase auth session provides a JWT that can be passed as a Bearer token to the NestJS API for authentication.
- The existing NestJS guards (`JwtAuthGuard`, `TenantGuard`, `RolesGuard`) correctly validate the JWT and enforce tenant/role restrictions.
- The database migration from 008 (`20260409000000_users_module.sql`) is retained as-is — no schema changes are needed.
- The seed data (mock super admin, user groups "Moroso"/"Cumplido") from 008 is retained as-is.
- The `@ramcar/shared` types and validators will be updated: `createUserSchema` adds optional `password`/`confirmPassword` fields and makes `address`, `username`, `phone` required. `updateUserSchema` makes `address`, `username`, `phone` required. Other shared types are retained as-is.
- The Users submodule UI is web-only. Desktop app does not have a Users management UI.
- Both email and username serve as valid login identifiers. The Supabase auth account is created with the email; username-based login lookup is handled at the API level.
- The create form pre-populates the status field to "active". New users always default to "active" status.
- The edit form does not include password fields. Password resets for existing users are a separate concern outside this feature's scope.
