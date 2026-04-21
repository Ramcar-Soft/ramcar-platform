# Feature Specification: Users Catalog — Migrate New/Edit Forms to Right-Side Sheet

**Feature Branch**: `015-users-form-sidebar`
**Created**: 2026-04-21
**Status**: Draft
**Input**: User description: "I want to homogenize how the forms are displayed across the app, the module of users catalog currently uses a new/edit pages to display the form to capture new user or edit existing users, instead I want to reuse the same right sidebar (Sheet) to display that form instead of navigating to a new route/page, since this is an app that will be used internally, sharing direct links is not necessary atm, create a plan to migrate the current new/edit views to use the right side bar as in other modules"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Create a new user from the catalog without leaving the list (Priority: P1)

An admin viewing the users catalog clicks the "Create User" button and the existing user form opens in a right-side Sheet panel. They fill the fields, press "Create", the panel closes, and the table refreshes with the new user. They never leave the `/catalogs/users` URL.

**Why this priority**: This is the primary write path for the users module and the most common action; it must stop navigating to `/catalogs/users/new` so the experience matches Visitors, Providers, and Residents (which already use the right-side Sheet).

**Independent Test**: Open the users catalog, click "Create User", confirm the Sheet opens on the right, fill the form, submit, and confirm the row appears in the table without a page transition.

**Acceptance Scenarios**:

1. **Given** the user is on `/catalogs/users` with role `super_admin` or `admin`, **When** they click "Create User", **Then** a right-side Sheet opens containing the user form in create mode; the URL does NOT change.
2. **Given** the create Sheet is open, **When** the user completes required fields and presses "Create", **Then** `POST /api/users` is called and on success the Sheet closes, a success toast appears, and the user table re-queries (new row visible).
3. **Given** the create Sheet is open, **When** the user presses "Cancel" or the Sheet overlay/Esc, **Then** the Sheet closes without submitting; any in-progress draft persists under the existing `user-create` localStorage key.
4. **Given** the user has role `resident` or `guard`, **When** they view the users catalog, **Then** the "Create User" button is not rendered (existing UI role-gate is preserved).

---

### User Story 2 — Edit an existing user from the catalog without leaving the list (Priority: P1)

An admin viewing the users catalog clicks a row (or the row's "Edit" action) and the user form opens in the same right-side Sheet, pre-populated with that user's data. They change a field, press "Save", the panel closes, and the table row reflects the updated values. They never leave `/catalogs/users`.

**Why this priority**: Same rationale as P1 — editing is the other primary write path. Today the table navigates to `/catalogs/users/[id]/edit`, which is exactly the inconsistency this feature removes.

**Independent Test**: Open the users catalog, click an editable row, confirm the Sheet opens on the right pre-populated with the user's data, change a field, press "Save", and confirm the table row updates in place.

**Acceptance Scenarios**:

1. **Given** a user row with `canEdit: true`, **When** the row is clicked (or the row-actions "Edit" item is clicked), **Then** the right-side Sheet opens in edit mode showing the user's current field values; the URL does NOT change to `/catalogs/users/[id]/edit`.
2. **Given** the edit Sheet is open and user data is still loading, **When** the Sheet is visible, **Then** a loading indicator is shown inside the Sheet body (not a full-page redirect/skeleton).
3. **Given** the edit Sheet finishes loading and the admin edits a field, **When** they press "Save", **Then** `PUT /api/users/:id` is called and on success the Sheet closes, a success toast appears, and the table row reflects the new values.
4. **Given** the edit Sheet is open, **When** the admin presses "Cancel" or dismisses the Sheet, **Then** the Sheet closes without submitting; any in-progress draft persists under the existing per-user key `user-edit-<id>`.
5. **Given** a row with `canEdit: false`, **When** the row is clicked, **Then** the Sheet does NOT open (existing non-editable row behavior is preserved).

---

### User Story 3 — Legacy `/new` and `/[id]/edit` URLs no longer exist (Priority: P2)

Any residual link, bookmark, or stale router push to `/catalogs/users/new` or `/catalogs/users/[id]/edit` lands the user on the users list. The separate "page" routes for create/edit are removed entirely; the Sheet is the only place users are created or edited.

**Why this priority**: Cleanup — leaving dead routes produces two code paths for the same action, which re-creates the inconsistency. This is also what the user explicitly asked for ("migrate the current new/edit views to use the right side bar").

**Independent Test**: Navigating directly to `/catalogs/users/new` or `/catalogs/users/<some-id>/edit` no longer renders a form page — it renders the 404/unknown-route behavior (or redirects to `/catalogs/users`, per routing decision in Phase 0).

**Acceptance Scenarios**:

1. **Given** the legacy routes have been removed, **When** the user manually visits `/<locale>/catalogs/users/new`, **Then** they are redirected to `/<locale>/catalogs/users` (preferred) OR they see the framework's not-found response.
2. **Given** the legacy routes have been removed, **When** the user manually visits `/<locale>/catalogs/users/<id>/edit`, **Then** the same behavior as (1) applies.
3. **Given** the codebase after this change, **When** searched for the string `catalogs/users/new` or `catalogs/users/[id]/edit`, **Then** there are no remaining references in `apps/web/src` (including tests).

---

### User Story 4 — Keyboard-driven catalog users can still create and edit via the Sheet (Priority: P3)

A keyboard user navigates the table with the shared `useKeyboardNavigation` hook, highlights a row, presses Enter, and the Sheet opens in edit mode. While the Sheet is open, keyboard navigation on the table is suspended (same pattern as Visitors/Providers) so that table shortcuts don't fight form focus. Closing the Sheet (Esc or explicit close) restores table navigation.

**Why this priority**: The catalog was recently unified to use the shared keyboard-navigation hook (see commit "fix: users catalog to follow patterns & unify keyboard hook"). The Sheet migration must preserve that unification, not regress it.

**Independent Test**: With focus in the users search input, press ArrowDown to highlight a row, press Enter, and verify the edit Sheet opens; press Esc and verify focus returns to the table area.

**Acceptance Scenarios**:

1. **Given** the users table is focused and keyboard navigation is active, **When** the user presses Enter on a highlighted row with `canEdit: true`, **Then** the Sheet opens in edit mode for that user.
2. **Given** the Sheet is open, **When** the user interacts with the table via keyboard, **Then** the `useKeyboardNavigation` hook is disabled (via its `disabled` option) so row navigation does not shift while the form has focus.
3. **Given** the Sheet is closed after an edit or cancel, **When** the user presses ArrowDown, **Then** table row highlight resumes from the previously highlighted row (or from the top if none).

---

### Edge Cases

- **Draft collision between create and edit**: The existing form uses `user-create` for create and `user-edit-<id>` for edit keys; migrating to a Sheet must not merge these namespaces. Opening the Sheet in create mode must restore only the create draft; switching the Sheet to edit for user X must restore only that user's edit draft.
- **Opening Sheet in edit mode while the target user's fetch is still loading**: The Sheet header shows the title (e.g., "Edit User") and the body shows a spinner; the form is not rendered until `useGetUser(id)` resolves successfully. If the fetch errors, the Sheet body shows the existing error message (translated `users.errorLoading`).
- **Admin editing themselves**: The role `Select` must remain disabled with the "You cannot change your own role" hint (existing `roleLocked` behavior in `UserForm`). This is orthogonal to the Sheet wrapper — behavior is preserved unchanged.
- **Password fields in edit mode**: Still hidden in edit mode (`mode === "edit"`), exactly as today. Moving to a Sheet must not change which fields are shown per mode.
- **Non-admin role tries to open the Sheet via stale button/shortcut**: There is no viable path — the button is not rendered for non-admins, keyboard nav only opens Sheet on rows where `canEdit: true`, and the backend `POST /api/users` and `PUT /api/users/:id` remain protected by `JwtAuthGuard + RolesGuard`. The server-side guard that the removed `/new/page.tsx` performed (`if role !== "super_admin" && role !== "admin" redirect`) is NOT load-bearing — it was UX, not security.
- **Navigating away with unsaved changes**: Closing the Sheet does not warn today and does not need to now — `useFormPersistence` auto-saves to localStorage so the user can reopen and resume. This preserves the existing behavior, which was also present in the page-based form.
- **Table in error state when Sheet is opened to create**: Creating is still possible even if the current list failed to load — the Sheet doesn't depend on the table's query.
- **Concurrent create + edit**: Only one Sheet instance at a time. Clicking "Create User" while the Sheet is open in edit mode closes the edit flow and opens create (same single-instance Sheet pattern used in Visitors/Providers).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The users catalog page (`/<locale>/catalogs/users`) MUST host a single right-side `Sheet` instance used for both creating a new user and editing an existing user.
- **FR-002**: The "Create User" button on the users table MUST open the Sheet in create mode (no URL navigation) instead of calling `router.push(.../users/new)`.
- **FR-003**: Clicking an editable row (or invoking the row-actions "Edit" item) MUST open the Sheet in edit mode for that row's user (no URL navigation) instead of calling `router.push(.../users/[id]/edit)`.
- **FR-004**: The Sheet MUST use `side="right"` and the same width conventions as other Sheet-based modules (`w-[400px] sm:w-[800px] sm:max-w-[800px] overflow-y-auto px-4 pb-6`) for visual consistency.
- **FR-005**: The Sheet header MUST show a context-aware title — "Create User" in create mode, "Edit User" in edit mode — using the existing `users.createUser` / `users.editUser` i18n keys.
- **FR-006**: In edit mode, the Sheet body MUST render a loading indicator while `useGetUser(id)` is pending and an error message (translated `users.errorLoading`) if the fetch fails; the form MUST only render when data is available.
- **FR-007**: The existing `UserForm` component MUST be reused as-is (no props contract change) — it already accepts `mode`, `initialData`, `tenants`, `userGroups`, `isPending`, `onSubmit`, `onCancel`.
- **FR-008**: Draft persistence behavior MUST be preserved: create drafts under `user-create`, edit drafts under `user-edit-<id>`, password fields excluded from localStorage (current `excludeFields` behavior).
- **FR-009**: After a successful create, the Sheet MUST close, a success toast MUST appear (`users.messages.created`), and the users list query MUST be invalidated (already done inside `useCreateUser`).
- **FR-010**: After a successful update, the Sheet MUST close, a success toast MUST appear (`users.messages.updated`), and the users list query MUST be invalidated (already done inside `useUpdateUser`).
- **FR-011**: Cancelling (explicit Cancel button, overlay click, or Esc key) MUST close the Sheet without submitting; the draft MUST be preserved per the existing `useFormPersistence` contract. Pressing the form's Cancel button retains the current `discardDraft()` behavior so the user opts-in to throwing the draft away.
- **FR-012**: The Sheet MUST disable the shared `useKeyboardNavigation` hook while `open === true`, mirroring the pattern in `VisitorsView` and `ResidentsPageClient`, so row navigation shortcuts do not compete with form focus.
- **FR-013**: The `/<locale>/catalogs/users/new/page.tsx` and `/<locale>/catalogs/users/[id]/edit/page.tsx` route files MUST be deleted, along with `create-user-page-client.tsx` and `edit-user-page-client.tsx`.
- **FR-014**: Any remaining reference in `apps/web/src` to the removed routes (navigation strings, test assertions, `redirect({ href: "/catalogs/users/new" })` if any) MUST be updated or removed.
- **FR-015**: The "Create User" button visibility rule MUST remain unchanged — rendered only when the current user's role is `super_admin` or `admin` (existing `UsersTable` conditional).
- **FR-016**: The row-click "edit" affordance MUST remain unchanged — only fires when `row.canEdit === true` (existing `UsersTable` conditional).
- **FR-017**: Server-side role enforcement on `POST /api/users` and `PUT /api/users/:id` MUST remain intact (NestJS guards) — no backend change. No new middleware is needed to compensate for the removed `/new/page.tsx` redirect, because that redirect was a pure UX guard, not authz.
- **FR-018**: Existing tests MUST continue to pass after targeted updates: `users-table-interaction.test.tsx` (currently asserts `router.push` with `/en/catalogs/users/p1/edit`) MUST be updated to assert the Sheet opens with the right mode and user instead; `user-form-role-lock.test.tsx`, `user-form-user-group.test.tsx`, and `users-table-columns.test.tsx` MUST continue to pass unchanged (they test the form, not navigation).
- **FR-019**: No direct database access from the frontend (Constitution VIII). The feature continues to use TanStack Query hooks that call the NestJS API; no new Supabase `.from()`, `.rpc()`, or `.storage` calls are introduced.

### Key Entities *(include if feature involves data)*

No new entities. This feature touches presentation only. Entities referenced (unchanged):

- **ExtendedUserProfile** (from `@ramcar/shared`) — shape of a user row; already rendered by `UsersTable` and consumed by `UserForm` via `initialData`.
- **CreateUserInput / UpdateUserInput** (from `@ramcar/shared`) — Zod-inferred DTOs; already consumed by `useCreateUser` / `useUpdateUser`; reused verbatim.
- **UserGroup / PhoneType / Role** — already consumed by `UserForm`; unchanged.

### Data Access Architecture *(mandatory for features involving data)*

| Operation | API Endpoint | HTTP Method | Request DTO | Response DTO |
|-----------|-------------|-------------|-------------|--------------|
| List users (table — existing) | `/api/users` | GET | `UserFilters` query params | `PaginatedResponse<ExtendedUserProfile>` |
| Get user by id (edit mode) | `/api/users/:id` | GET | — | `ExtendedUserProfile` |
| Create user (create mode) | `/api/users` | POST | `CreateUserInput` (Zod in `@ramcar/shared`) | `ExtendedUserProfile` |
| Update user (edit mode) | `/api/users/:id` | PUT | `UpdateUserInput` (Zod in `@ramcar/shared`) | `{ success: boolean; user: ExtendedUserProfile }` |
| List tenants (form `tenant` field — existing) | `/api/tenants` | GET | — | `{ id; name }[]` |
| List user groups (form `userGroup` field — existing) | `/api/user-groups` | GET | — | `UserGroup[]` |

**Frontend data flow**: TanStack Query → NestJS API → Repository → Supabase/Postgres
**Allowed frontend Supabase usage**: Auth (`supabase.auth.*`) and Realtime (`supabase.channel()`) only

No new endpoints. No changes to request/response shapes. No new Zod schemas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero files under `apps/web/src/app/**` reference the path segments `users/new` or `users/[id]/edit` after the change (verifiable by `grep`).
- **SC-002**: The users catalog renders zero navigation transitions (no `router.push`) for create-user and edit-user flows — both are pure Sheet interactions.
- **SC-003**: The Sheet opens (from click to first paint of the form in create mode) in under 500 ms on a healthy connection — matches the Visitors/Providers benchmark from spec 012.
- **SC-004**: All existing users-module tests pass post-change; the single navigation-assertion test (`users-table-interaction.test.tsx`) is updated in place to assert Sheet open semantics.
- **SC-005**: The visual and interaction pattern of the users Sheet (width, header, body scrolling, close-button placement, open/close animation) is indistinguishable from Visitors/Providers when viewed side-by-side in the same locale and theme.
- **SC-006**: No new Supabase client calls are introduced outside `supabase.auth.*` and `supabase.channel()`; Constitution VIII is not regressed (verifiable by `grep` for `supabase.from|supabase.rpc|supabase.storage` in `apps/web/src`).
- **SC-007**: No new `@ramcar/features` package exports are required — users remains a web-only local feature per CLAUDE.md ("web: `users`" is explicitly listed as single-app).
