# Feature Specification: Catalog Users Management

**Feature Branch**: `008-catalog-users`  
**Created**: 2026-04-09  
**Status**: Draft  
**Input**: User description: "Implement Users submodule within Catalogs with CRUD, role-based access, profile management, user groups, and mock super admin"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View and Search Users List (Priority: P1)

A Super Admin or Admin navigates to Catalogs > Users and sees a paginated list of all users within the platform. They can type into a search box to filter by any visible field (name, email, phone, role, username, etc.), filter by tenant, and click column headers to sort. Each row shows user details and action controls for editing or deleting.

**Why this priority**: The user list is the foundation of user management. Without the ability to see and find existing users, no other user management tasks can be performed.

**Independent Test**: Can be fully tested by navigating to the Users page and verifying the table loads with all existing users, search narrows results correctly, tenant filter works, and column sorting reorders rows.

**Acceptance Scenarios**:

1. **Given** a Super Admin is logged in, **When** they navigate to Catalogs > Users, **Then** they see a table listing all users across all tenants with columns for name, email, role, tenant, phone, status, and user groups.
2. **Given** the Users list is displayed, **When** the user types "guard" into the search box, **Then** only users whose name, email, role, username, phone, or other visible fields match "guard" are displayed.
3. **Given** the Users list is displayed, **When** the user selects a specific tenant from the tenant filter, **Then** only users belonging to that tenant are shown.
4. **Given** the Users list is displayed, **When** the user clicks the "Name" column header, **Then** the list is sorted alphabetically by name (toggles ascending/descending on repeated clicks).
5. **Given** an Admin is logged in, **When** they navigate to Catalogs > Users, **Then** they see users within their own tenant only and can filter/sort/search within that scope.

---

### User Story 2 - Create a New User (Priority: P1)

A Super Admin or Admin navigates to the create user form, fills in the required details (full name, email, role, tenant, and optional fields like address, username, phone, observations, user groups), and submits. The system creates both a Supabase auth account and a profile record.

**Why this priority**: Creating users is the primary write operation and core purpose of this module. Admins need to onboard new residents, guards, and other staff.

**Independent Test**: Can be fully tested by filling out the create user form, submitting it, and verifying the new user appears in the list and can sign in.

**Acceptance Scenarios**:

1. **Given** a Super Admin is on the create user page, **When** they fill in all required fields and submit, **Then** a new authentication account is created, a profile record is inserted, and they are redirected to the users list with a success message.
2. **Given** an Admin is on the create user page, **When** they try to assign the "admin" or "super_admin" role, **Then** those options are not available in the role selector — they can only assign "guard" or "resident".
3. **Given** a Super Admin is on the create user page, **When** they fill in the form, **Then** all four roles (super_admin, admin, guard, resident) are available in the role selector.
4. **Given** any authorized user is on the create user page, **When** they submit with a duplicate email address, **Then** the system displays a validation error indicating the email is already in use.
5. **Given** any authorized user is on the create user page, **When** they leave required fields (full name, email, role, tenant) empty and submit, **Then** the system shows validation errors for each missing required field.

---

### User Story 3 - Edit an Existing User (Priority: P2)

A Super Admin or Admin opens an existing user's profile from the list, modifies details (name, phone, address, role, tenant, user groups, observations, status), and saves. Changes are persisted to both the auth metadata and profile table.

**Why this priority**: Editing users is essential for maintaining accurate records as residents move, roles change, or contact details are updated.

**Independent Test**: Can be fully tested by editing any field on an existing user's profile and verifying the updated value persists on reload.

**Acceptance Scenarios**:

1. **Given** a Super Admin clicks "Edit" on a user in the list, **When** the edit form loads, **Then** all fields are pre-filled with the user's current data.
2. **Given** an Admin edits a user, **When** they try to change the role to "admin" or "super_admin", **Then** those options are not available.
3. **Given** a Super Admin edits a user's role from "resident" to "guard", **When** they save, **Then** the role is updated in both the profile table and the auth JWT metadata.
4. **Given** a user's tenant is changed, **When** the form is saved, **Then** the profile's tenant association is updated.
5. **Given** an Admin views the users list, **When** they see a Super Admin user, **Then** the edit and deactivate controls are disabled or hidden for that user.
6. **Given** an Admin views the users list, **When** they see another Admin or a guard/resident, **Then** the edit and deactivate controls are available.

---

### User Story 4 - Deactivate a User (Priority: P2)

A Super Admin or Admin can deactivate a user from the list. The system prompts for confirmation before setting the user's status to "inactive". The user's authentication account and profile data are retained, but the user can no longer log in. Deactivated users remain visible in the list (filterable by status) and can be reactivated.

**Why this priority**: Deactivating users is necessary for handling ex-residents, terminated guards, or suspended accounts while preserving historical data.

**Independent Test**: Can be fully tested by deactivating a user and verifying their status changes to "inactive", they appear as inactive in the list, and they cannot sign in.

**Acceptance Scenarios**:

1. **Given** a Super Admin clicks "Deactivate" on a user row, **When** a confirmation dialog appears and they confirm, **Then** the user's status is set to "inactive" and they can no longer log in.
2. **Given** a Guard or Resident is logged in, **When** they navigate to Catalogs > Users, **Then** they do not have access to this page (redirected or shown unauthorized).
3. **Given** an Admin clicks "Deactivate", **When** the confirmation dialog appears, **Then** only users within their own tenant can be deactivated.
4. **Given** an inactive user exists, **When** a Super Admin or Admin clicks "Reactivate" on that user, **Then** the user's status is set to "active" and they can log in again.

---

### User Story 5 - User Groups Management (Priority: P3)

The system maintains user groups (e.g., "Moroso", "Cumplido") that can be assigned to users. User groups are seeded with initial values and can be selected on the user create/edit form as a multi-select field.

**Why this priority**: User groups provide classification and tagging capability but are not essential to core user CRUD operations.

**Independent Test**: Can be fully tested by creating/editing a user and assigning one or more user groups, then verifying the groups appear correctly on the user's profile.

**Acceptance Scenarios**:

1. **Given** the database is freshly seeded, **When** the user opens the create user form, **Then** the user groups multi-select shows "Moroso" and "Cumplido" as available options.
2. **Given** a user is being created, **When** the admin selects both "Moroso" and "Cumplido" groups, **Then** both group associations are saved and visible when editing that user.
3. **Given** a user has groups assigned, **When** viewed in the users list, **Then** the assigned groups are displayed in the user's row.

---

### User Story 6 - Mock Super Admin Seed Data (Priority: P1)

A mock super admin user is added to the seed data so that developers can log in with super admin privileges during local development.

**Why this priority**: Without a super admin seed user, developers cannot test super admin-specific functionality like assigning admin roles.

**Independent Test**: Can be fully tested by resetting the local database and logging in with the super admin credentials.

**Acceptance Scenarios**:

1. **Given** a developer runs `pnpm db:reset`, **When** the seed completes, **Then** a super admin user exists with known credentials that can be used to log in.
2. **Given** the super admin seed user exists, **When** they log in and navigate to Catalogs > Users, **Then** they have full access including all four role options when creating/editing users.

---

### Edge Cases

- What happens when a user tries to deactivate themselves? The system should prevent self-deactivation with a clear error message.
- What happens when the last active super admin is being deactivated? The system should prevent deactivation if it would leave no active super admin users.
- What happens when a user is created with a username that already exists? The system should display a validation error for duplicate usernames.
- How does the system handle a user belonging to multiple tenants? Based on the current schema, each profile is tied to a single tenant. A user can belong to only one tenant per profile.
- What happens when user groups referenced by a user are deleted? User group references should remain valid; group deletion is out of scope for this feature.
- What happens when an Admin attempts to edit a Super Admin via direct URL/API? The system should enforce role hierarchy on the server side, returning a forbidden error regardless of how the request is made.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST restrict access to the Users submodule to users with the "super_admin" or "admin" role only.
- **FR-002**: System MUST display a searchable, sortable, paginated list of users with columns for full name, email, role, tenant, phone, status, and user groups.
- **FR-003**: System MUST allow searching across all visible user fields (full name, email, username, phone, role, status, user groups) via a single search input.
- **FR-004**: System MUST allow filtering the user list by tenant.
- **FR-005**: System MUST allow sorting the user list by any column (ascending/descending toggle).
- **FR-006**: System MUST provide a create user form with fields: full name (required), email (required), role (required), tenant (required), address, username, phone, phone type (house/cellphone/work/primary), status, user groups (multi-select), and observations.
- **FR-007**: System MUST create both an authentication account and a profile record when a new user is created.
- **FR-008**: System MUST restrict Admin users to assigning only "guard" and "resident" roles; only Super Admins can assign "admin" or "super_admin" roles.
- **FR-009**: System MUST validate that email addresses are unique across all users before creation.
- **FR-010**: System MUST validate that usernames (if provided) are unique across all users.
- **FR-011**: System MUST provide an edit user form pre-filled with the user's current data and allow updating all profile fields.
- **FR-012**: System MUST implement soft delete — "Deactivate" sets the user's status to "inactive" (auth account and profile data are retained; user cannot log in).
- **FR-013**: System MUST prevent users from deactivating their own account.
- **FR-013a**: System MUST allow reactivation of inactive users, restoring their ability to log in.
- **FR-013b**: System MUST allow filtering the users list by status (active/inactive/all).
- **FR-013c**: System MUST enforce role hierarchy for edit/deactivate actions — Admins can only edit or deactivate users with equal or lower roles (admin, guard, resident). Super Admin profiles are read-only for Admin users. Super Admins can edit/deactivate any user.
- **FR-014**: System MUST extend the profiles table with: address, username, phone, phone_type, status, user_group_ids, and observations fields.
- **FR-015**: System MUST create a user_groups table with id and name fields, seeded with "Moroso" and "Cumplido" entries.
- **FR-016**: System MUST include a mock super admin user in the seed data for local development.
- **FR-017**: System MUST update auth JWT metadata (role, tenant_id) when a user's role or tenant is changed.
- **FR-018**: System MUST show appropriate validation errors for required fields, duplicate emails, and duplicate usernames.
- **FR-019**: Feature MUST include unit tests for all apps involved: web (frontend components/hooks), API (service/controller/repository layers), and desktop (shared packages only — validators and store slices used by desktop).
- **FR-020**: Feature MUST include end-to-end tests where applicable: web (Playwright for user list, create, edit, delete flows) and API (integration tests for CRUD endpoints with role-based access).

### Key Entities

- **User (Profile)**: Represents a person in the system. Key attributes: full name, email, role, tenant, address, username, phone, phone type, status, user groups, observations. Linked to Supabase auth user via user_id.
- **User Group**: A classification category for users (e.g., "Moroso", "Cumplido"). Key attributes: id, name. Referenced by profiles via user_group_ids.
- **Tenant**: The residential community a user belongs to. Each profile is associated with exactly one tenant.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Authorized users (Admin, Super Admin) can view, search, filter, and sort the complete users list within 2 seconds of page load.
- **SC-002**: A new user can be fully created (form fill + submit + confirmation) in under 60 seconds.
- **SC-003**: Role assignment restrictions are enforced 100% of the time — Admin users can never assign admin/super_admin roles.
- **SC-004**: All CRUD operations (create, read, update, delete) for users work correctly and reflect changes immediately in the list.
- **SC-005**: Search results update as the user types, with results appearing within 500 milliseconds of input.
- **SC-006**: The mock super admin seed user can successfully log in and access all user management features after a database reset.
- **SC-007**: Deactivating a user sets their status to "inactive" and prevents them from logging in, while retaining all profile and auth data for potential reactivation.

## Clarifications

### Session 2026-04-09

- Q: Does the Users submodule need UI in the desktop app, or is desktop involvement limited to shared packages? → A: Web-only UI; desktop tests cover shared packages only (`@ramcar/shared` validators, `@ramcar/store` slices).
- Q: Should "Delete" permanently remove the user (hard delete) or deactivate them (soft delete)? → A: Soft delete only — sets status to "inactive", auth account remains, user cannot log in but data is retained.
- Q: Can an Admin edit or deactivate higher-role users (other Admins, Super Admins) in their tenant? → A: Admins can only edit/deactivate users with equal or lower roles; Super Admin profiles are read-only for Admins.

## Assumptions

- Each user profile belongs to exactly one tenant. Multi-tenant membership for a single user is not supported in this feature.
- Phone type is a single selection from a predefined list: house, cellphone, work, primary.
- User group management (creating, editing, or deleting groups) is out of scope — this feature only supports assigning existing groups to users.
- The username field is optional and can be left blank. When provided, it must be unique and can be used as an alternative login identifier.
- Status values are "active" and "inactive". "Inactive" is the soft-delete state — users cannot log in but data is retained. New users default to "active".
- The initial password for newly created users will be generated or set by the system, with the user receiving a password reset link via email.
- Pagination defaults to a reasonable page size (e.g., 20 users per page).
- Admin users can only see and manage users within their own tenant; Super Admins can see and manage users across all tenants.
- The Users submodule UI is web-only (catalogs platform is "web"). Desktop app does not have a Users management UI. Desktop involvement is limited to testing shared packages (`@ramcar/shared`, `@ramcar/store`) that are consumed by the desktop app.
