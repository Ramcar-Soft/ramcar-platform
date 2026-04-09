# Tasks: Catalog Users Management

**Input**: Design documents from `/specs/008-catalog-users/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-endpoints.md, quickstart.md

**Tests**: Included — explicitly requested in FR-019 and FR-020.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migration, shared types/validators, navigation config, seed data, i18n

- [x] T001 Create migration file `supabase/migrations/20260409000000_users_module.sql` — alter profiles table (add address, username, phone, phone_type, status, user_group_ids, observations columns with constraints and indexes), create user_groups table with RLS, update profiles RLS policies for insert/update/cross-tenant Super Admin access per data-model.md
- [x] T002 [P] Update `supabase/seed.sql` — add Super Admin mock user (superadmin@ramcar.dev / password123 / super_admin role), add user_groups seed data ("Moroso", "Cumplido") per spec US6
- [x] T003 [P] Create shared user types in `packages/shared/src/types/user.ts` — export UserProfile (extended with new fields), UserGroup, PhoneType union, UserStatus union, ROLE_HIERARCHY constant, canModifyUser utility, PaginatedResponse type, UserFilters type
- [x] T004 [P] Create Zod validators in `packages/shared/src/validators/user.ts` — export createUserSchema, updateUserSchema, userFiltersSchema, toggleStatusSchema per data-model.md validation rules
- [x] T005 [P] Update sidebar config in `packages/shared/src/navigation/sidebar-config.ts` — add subItems to "catalogs" entry: `[{ key: "users", route: "/catalogs/users" }]`
- [x] T006 [P] Add i18n translations for users module in `packages/i18n/src/messages/es.json` and `packages/i18n/src/messages/en.json` — keys for users page title, table columns, form labels, status badges, actions, validation messages, confirmation dialogs
- [x] T007 [P] Re-export new types and validators from `packages/shared/src/index.ts` — add exports for user types, validators, and role hierarchy utilities
- [x] T008 Regenerate DB types by running `pnpm db:types` after migration is applied (depends on T001 being migrated)

**Checkpoint**: Shared infrastructure ready — migration applied, types/validators available, seed data updated.

---

## Phase 2: Foundational (API Module Scaffold)

**Purpose**: NestJS module scaffolding that MUST be complete before any user story endpoint work

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T009 Create user-groups module in `apps/api/src/modules/user-groups/` — user-groups.module.ts, user-groups.controller.ts (GET /user-groups with @Roles('super_admin', 'admin')), user-groups.service.ts, user-groups.repository.ts (Supabase query to select all from user_groups table)
- [x] T010 [P] Create users module scaffold in `apps/api/src/modules/users/users.module.ts` — import SupabaseModule, UserGroupsModule; declare controller, service, repository providers
- [x] T011 [P] Create users DTOs in `apps/api/src/modules/users/dto/` — create-user.dto.ts (from createUserSchema), update-user.dto.ts (from updateUserSchema), user-filters.dto.ts (from userFiltersSchema) using Zod schemas from @ramcar/shared
- [x] T012 Create users repository shell in `apps/api/src/modules/users/users.repository.ts` — inject SupabaseService, define method signatures for list, getById, create, update, toggleStatus
- [x] T013 Create users service shell in `apps/api/src/modules/users/users.service.ts` — inject UsersRepository, define method signatures matching controller needs
- [x] T014 Create users controller shell in `apps/api/src/modules/users/users.controller.ts` — add @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard), @Roles('super_admin', 'admin'), inject UsersService, define route handlers as stubs
- [x] T015 Register both modules in AppModule at `apps/api/src/app.module.ts` — import UsersModule and UserGroupsModule

**Checkpoint**: API modules registered, shells in place — user story endpoint implementation can now begin.

---

## Phase 3: User Story 1 — View and Search Users List (Priority: P1) MVP

**Goal**: Admin/Super Admin navigates to Catalogs > Users and sees a paginated, searchable, sortable, filterable table of all users.

**Independent Test**: Navigate to /catalogs/users, verify table loads with users, search narrows results, tenant filter works, column sorting reorders rows.

### Tests for User Story 1

- [x] T016 [P] [US1] Unit test for users repository list method in `apps/api/src/modules/users/__tests__/users.repository.spec.ts` — test query building with search, tenant filter, status filter, sort, pagination; mock SupabaseService
- [x] T017 [P] [US1] Unit test for users service list method in `apps/api/src/modules/users/__tests__/users.service.spec.ts` — test tenant scoping (Admin vs Super Admin), role hierarchy canEdit/canDeactivate computation, pagination meta

### Implementation for User Story 1

- [x] T018 [US1] Implement list method in users repository `apps/api/src/modules/users/users.repository.ts` — build dynamic Supabase query with ilike search across full_name/email/username/phone/role, eq filter for tenant_id and status, order by sort_by/sort_order, range pagination, join tenant name, resolve user_group_ids to user_groups names
- [x] T019 [US1] Implement list method in users service `apps/api/src/modules/users/users.service.ts` — enforce tenant scoping (Admin auto-scoped to own tenant), compute canEdit/canDeactivate per row using ROLE_HIERARCHY, return paginated response with meta
- [x] T020 [US1] Implement GET /users in controller `apps/api/src/modules/users/users.controller.ts` — accept query params (search, tenant_id, status, sort_by, sort_order, page, page_size), validate with userFiltersSchema, inject @CurrentUser and @CurrentTenant, call service.list()
- [x] T021 [P] [US1] Create feature types in `apps/web/src/features/users/types/index.ts` — UserListItem, UserListResponse, UserFiltersState interfaces matching API contract
- [x] T022 [P] [US1] Create user-status-badge component in `apps/web/src/features/users/components/user-status-badge.tsx` — render active (green) / inactive (gray) badge using shadcn Badge
- [x] T023 [P] [US1] Create user-filters component in `apps/web/src/features/users/components/user-filters.tsx` — search input (debounced), tenant select dropdown (Super Admin only), status filter (all/active/inactive), uses useTranslations for labels
- [x] T024 [US1] Create users-table-columns definition in `apps/web/src/features/users/components/users-table-columns.tsx` — column defs for full_name, email, role, tenant, phone, status (badge), user_groups, actions (edit/deactivate buttons respecting canEdit/canDeactivate)
- [x] T025 [US1] Create users-table component in `apps/web/src/features/users/components/users-table.tsx` — shadcn DataTable with server-side sorting (column header click toggles sort_by/sort_order), pagination controls, "Create User" button linking to /catalogs/users/new
- [x] T026 [US1] Create useUsers TanStack Query hook in `apps/web/src/features/users/hooks/use-users.ts` — query key ["users", tenantId, filters], fetch from API GET /users with filters, return data + meta + isLoading
- [x] T027 [P] [US1] Create useUserGroups TanStack Query hook in `apps/web/src/features/users/hooks/use-user-groups.ts` — query key ["user-groups"], fetch from API GET /user-groups
- [x] T028 [US1] Create get-users server action in `apps/web/src/features/users/actions/get-users.ts` — "use server", call Supabase or API to fetch users with filters (for SSR initial load)
- [x] T029 [US1] Create users list page in `apps/web/src/app/[locale]/(dashboard)/catalogs/users/page.tsx` — render UsersTable with UserFilters, server-side initial data via get-users action
- [x] T030 [US1] Update catalogs landing page in `apps/web/src/app/[locale]/(dashboard)/catalogs/page.tsx` — redirect to /catalogs/users or render links to catalog sub-modules
- [x] T031 [P] [US1] Unit test users-table component in `apps/web/src/features/users/__tests__/users-table.test.tsx` — renders table with mock data, shows correct columns, pagination controls visible
- [x] T032 [P] [US1] Unit test user-filters component in `apps/web/src/features/users/__tests__/user-filters.test.tsx` — search input triggers filter, tenant dropdown shows for Super Admin role, status filter works

**Checkpoint**: Users list page fully functional — search, filter by tenant/status, sort by any column, paginated. MVP ready for validation.

---

## Phase 4: User Story 2 — Create a New User (Priority: P1)

**Goal**: Admin/Super Admin fills create form, submits, and both auth account + profile are created. Role assignment restricted by hierarchy.

**Independent Test**: Fill create form with all fields, submit, verify user appears in list and can sign in with reset link.

### Tests for User Story 2

- [x] T033 [P] [US2] Unit test for users service create method in `apps/api/src/modules/users/__tests__/users.service.spec.ts` — test auth user creation via admin API, profile insert, role restriction (Admin can't assign super_admin/admin), duplicate email/username 409, password reset link generation
- [x] T034 [P] [US2] Unit test user-form component in `apps/web/src/features/users/__tests__/user-form.test.tsx` — form renders all fields, required field validation, role dropdown options based on actor role, submit calls create action

### Implementation for User Story 2

- [x] T035 [US2] Implement create method in users repository `apps/api/src/modules/users/users.repository.ts` — supabase.auth.admin.createUser (email, temp password, email_confirm, app_metadata), insert profile row, generate password reset link, handle duplicate email/username errors
- [x] T036 [US2] Implement create method in users service `apps/api/src/modules/users/users.service.ts` — validate role assignment (Admin restricted to guard/resident), check email/username uniqueness, call repository.create(), return created user with resolved groups
- [x] T037 [US2] Implement POST /users in controller `apps/api/src/modules/users/users.controller.ts` — accept CreateUserDto body, inject @CurrentUser for role check, @CurrentTenant for Admin scoping, call service.create(), return 201
- [x] T038 [US2] Create user-form component in `apps/web/src/features/users/components/user-form.tsx` — reusable for create/edit, all fields from spec (full_name, email, role select, tenant select, address, username, phone, phone_type select, user_groups multi-select, observations textarea), Zod validation from @ramcar/shared, role options filtered by current user's role
- [x] T039 [US2] Create useCreateUser mutation hook in `apps/web/src/features/users/hooks/use-create-user.ts` — useMutation calling API POST /users, invalidate ["users"] query on success, return success/error state
- [x] T040 [US2] Create create-user server action in `apps/web/src/features/users/actions/create-user.ts` — "use server", validate with createUserSchema, call API
- [x] T041 [US2] Create new user page in `apps/web/src/app/[locale]/(dashboard)/catalogs/users/new/page.tsx` — render UserForm in create mode, redirect to /catalogs/users on success with toast

**Checkpoint**: User creation fully functional — form with validation, role restrictions, auth account + profile created, reset link generated.

---

## Phase 5: User Story 3 — Edit an Existing User (Priority: P2)

**Goal**: Admin/Super Admin opens edit form pre-filled with user data, modifies fields, saves. Role hierarchy enforced — Admin cannot edit Super Admin.

**Independent Test**: Click edit on user, change phone/address, save, verify changes persist on reload. Verify Admin cannot edit Super Admin.

### Tests for User Story 3

- [x] T042 [P] [US3] Unit test for users service update method in `apps/api/src/modules/users/__tests__/users.service.spec.ts` — test profile update, auth metadata sync on role/tenant change, role hierarchy enforcement (Admin editing Super Admin returns 403), duplicate email/username handling

### Implementation for User Story 3

- [x] T043 [US3] Implement getById method in users repository `apps/api/src/modules/users/users.repository.ts` — fetch single profile with tenant join and resolved user groups
- [x] T044 [US3] Implement update method in users repository `apps/api/src/modules/users/users.repository.ts` — update profile fields, sync auth.admin.updateUserById for email/role/tenant changes in app_metadata
- [x] T045 [US3] Implement getById and update methods in users service `apps/api/src/modules/users/users.service.ts` — enforce role hierarchy (canModifyUser check), tenant scoping for Admin, call repository
- [x] T046 [US3] Implement GET /users/:id and PUT /users/:id in controller `apps/api/src/modules/users/users.controller.ts` — accept UpdateUserDto body, inject @CurrentUser for role hierarchy check
- [x] T047 [P] [US3] Create useUser query hook in `apps/web/src/features/users/hooks/use-user.ts` — query key ["users", id], fetch single user from API GET /users/:id
- [x] T048 [P] [US3] Create useUpdateUser mutation hook in `apps/web/src/features/users/hooks/use-update-user.ts` — useMutation calling API PUT /users/:id, invalidate queries on success
- [x] T049 [P] [US3] Create get-user and update-user server actions in `apps/web/src/features/users/actions/get-user.ts` and `apps/web/src/features/users/actions/update-user.ts`
- [x] T050 [US3] Create edit user page in `apps/web/src/app/[locale]/(dashboard)/catalogs/users/[id]/edit/page.tsx` — fetch user with get-user action, render UserForm in edit mode (pre-filled), redirect on success

**Checkpoint**: User editing fully functional — pre-filled form, role hierarchy enforced, auth metadata synced on role/tenant changes.

---

## Phase 6: User Story 4 — Deactivate/Reactivate a User (Priority: P2)

**Goal**: Admin/Super Admin deactivates user (status=inactive, auth banned), can reactivate. Self-deactivation and last super admin protection enforced.

**Independent Test**: Deactivate a user, verify they can't log in and show as inactive in list. Reactivate, verify they can log in again.

### Tests for User Story 4

- [x] T051 [P] [US4] Unit test for users service toggleStatus in `apps/api/src/modules/users/__tests__/users.service.spec.ts` — test deactivate sets inactive + banned, reactivate sets active + unbanned, self-deactivation blocked, last super admin blocked, role hierarchy enforced

### Implementation for User Story 4

- [x] T052 [US4] Implement toggleStatus in users repository `apps/api/src/modules/users/users.repository.ts` — update profiles.status, call supabase.auth.admin.updateUserById with { ban_duration: 'none' } or { ban_duration: '876000h' } (banned)
- [x] T053 [US4] Implement toggleStatus in users service `apps/api/src/modules/users/users.service.ts` — check self-deactivation (compare current user id), check last active super admin (count active super_admins), check role hierarchy, call repository.toggleStatus()
- [x] T054 [US4] Implement PATCH /users/:id/status in controller `apps/api/src/modules/users/users.controller.ts` — accept toggleStatusSchema body, inject @CurrentUser
- [x] T055 [US4] Create useToggleUserStatus mutation hook in `apps/web/src/features/users/hooks/use-toggle-user-status.ts` — useMutation calling API PATCH /users/:id/status, invalidate queries on success
- [x] T056 [US4] Create toggle-user-status server action in `apps/web/src/features/users/actions/toggle-user-status.ts`
- [x] T057 [US4] Add deactivate/reactivate controls to table actions in `apps/web/src/features/users/components/users-table-columns.tsx` — confirmation dialog before deactivation, reactivate button for inactive users, controls hidden per canDeactivate flag and role hierarchy

**Checkpoint**: Soft delete fully functional — deactivate/reactivate cycle works, auth banned flag synced, all guard checks in place.

---

## Phase 7: User Story 5 — User Groups Assignment (Priority: P3)

**Goal**: Users can be assigned to one or more user groups via multi-select in create/edit forms. Groups displayed in list.

**Independent Test**: Create/edit a user assigning "Moroso" and "Cumplido" groups, verify groups display in list and persist on edit reload.

- [x] T058 [US5] Verify user-form multi-select for user groups works end-to-end in `apps/web/src/features/users/components/user-form.tsx` — ensure useUserGroups populates options, selected groups saved as uuid[] in userGroupIds, pre-filled on edit
- [x] T059 [US5] Verify users-table-columns displays user groups in list in `apps/web/src/features/users/components/users-table-columns.tsx` — render group names as comma-separated or badge chips from resolved userGroups field

**Checkpoint**: User groups assignment works in create/edit/list. Moroso and Cumplido seed data displayed correctly.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: E2E tests, shared package tests, validation, and cleanup

- [x] T060 [P] Zod validator unit tests in `packages/shared/src/validators/user.test.ts` — test createUserSchema, updateUserSchema, userFiltersSchema with valid/invalid inputs, boundary conditions (max lengths, required fields, email format, username pattern)
- [x] T061 [P] API controller integration tests in `apps/api/src/modules/users/__tests__/users.controller.spec.ts` — test full request/response cycle with NestJS TestingModule, verify guards, role restrictions, tenant scoping, HTTP status codes
- [x] T062 Playwright E2E tests in `apps/web/e2e/users.spec.ts` — scenarios: navigate to users list, create user (Super Admin with all roles), create user (Admin with restricted roles), edit user, deactivate/reactivate, search, sort, filter by tenant/status
- [x] T063 Run `pnpm lint` and `pnpm typecheck` across all workspaces — fix any TypeScript errors or ESLint violations introduced by this feature
- [x] T064 Run quickstart.md verification checklist — log in as Super Admin, create/edit/deactivate user, search/sort/filter, verify all 7 checklist items pass
- [x] T065 Verify `pnpm test` passes across all workspaces — all unit tests (shared, API, web) green

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (T001-T008) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational (Phase 2) — implements list/search/filter/sort
- **US2 (Phase 4)**: Depends on Foundational (Phase 2) — can run in parallel with US1 (API layer), but web pages link from US1 list
- **US3 (Phase 5)**: Depends on US2 (reuses user-form component from T038)
- **US4 (Phase 6)**: Depends on US1 (adds controls to users-table-columns from T024)
- **US5 (Phase 7)**: Depends on US2 + US3 (verifies group assignment in forms built in those phases)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1: Setup ─────────────────────────────────────┐
Phase 2: Foundational ──────────────────────────────┐│
                                                     ││
  ┌──────────────────────────────────────────────────┘│
  │                                                    │
  ├─→ US1: View/Search List (P1) ──┬──────────────────┘
  │                                 │
  ├─→ US2: Create User (P1) ──────┤
  │                                 │
  │   US3: Edit User (P2) ←── US2  │
  │                                 │
  │   US4: Deactivate (P2) ←── US1 │
  │                                 │
  │   US5: User Groups (P3) ←─ US2+US3
  │                                 │
  └─→ Polish (Phase 8) ←── All ────┘
```

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Repository before service
- Service before controller
- API endpoints before web hooks/actions
- Web components before page routes
- Story complete before moving to next priority

### Parallel Opportunities

- Phase 1: T002-T007 can all run in parallel (different files)
- Phase 2: T010-T011 can run in parallel with T009
- US1: T016-T017 tests parallel; T021-T023 web components parallel; T031-T032 web tests parallel
- US2: T033-T034 tests parallel; T047-T049 hooks/actions parallel
- US3-US4 API work can partially overlap (different endpoints)
- Phase 8: T060-T061 package/API tests parallel

---

## Parallel Example: User Story 1

```bash
# Launch tests in parallel:
Task T016: "Unit test for users repository list method"
Task T017: "Unit test for users service list method"

# Launch independent web components in parallel:
Task T021: "Create feature types in apps/web/src/features/users/types/index.ts"
Task T022: "Create user-status-badge component"
Task T023: "Create user-filters component"

# Launch web tests in parallel:
Task T031: "Unit test users-table component"
Task T032: "Unit test user-filters component"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (migration, types, validators, seed, i18n, navigation)
2. Complete Phase 2: Foundational (API module scaffold)
3. Complete Phase 3: User Story 1 (view/search/filter/sort list)
4. **STOP and VALIDATE**: Test US1 independently — list loads, search works, sort works, filter by tenant/status works
5. Deploy/demo if ready — users can now see and find existing users

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 → Test independently → Deploy (MVP: user list with search/sort/filter)
3. Add US2 → Test independently → Deploy (can now create users)
4. Add US3 → Test independently → Deploy (can now edit users)
5. Add US4 → Test independently → Deploy (can now deactivate/reactivate)
6. Add US5 → Test independently → Deploy (user group assignment verified)
7. Complete Polish → Full E2E coverage, all tests green

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (list) + US4 (deactivate, depends on US1 table)
   - Developer B: US2 (create) + US3 (edit, reuses US2 form) + US5 (groups verification)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Tests MUST fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Total tasks: 65 (8 setup + 7 foundational + 17 US1 + 9 US2 + 9 US3 + 7 US4 + 2 US5 + 6 polish)
