# Tasks: Catalog Users — API-First Refactor

**Input**: Design documents from `/specs/009-refactor-users-api-first/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-endpoints.md, quickstart.md

**Tests**: Included — spec requires unit tests (FR-020) and E2E tests (FR-021).

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Environment configuration and shared frontend utilities needed by all user stories.

- [x] T001 Add `NEXT_PUBLIC_API_URL=http://localhost:3001` to `.env`, `.env.development`, and `.env.example`
- [x] T002 Create shared API client with JWT auth header in `apps/web/src/shared/lib/api-client.ts` — export `apiClient` object with `get`, `post`, `put`, `patch`, `delete` methods that attach `Authorization: Bearer <token>` from `supabase.auth.getSession()` and use `NEXT_PUBLIC_API_URL` as base URL

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared schema updates, API endpoint changes, and new TenantsModule that MUST be complete before any user story work.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Update `createUserSchema` in `packages/shared/src/validators/user.ts` — make `address`, `username`, `phone` required; add optional `password` (min 8 chars) and `confirmPassword` fields with `.refine()` for match validation
- [x] T004 Update `updateUserSchema` in `packages/shared/src/validators/user.ts` — make `address`, `username`, `phone` required (no password fields)
- [x] T005 [P] Update `CreateUserDto` in `apps/api/src/modules/users/dto/create-user.dto.ts` — add optional `password` field, align with updated shared schema
- [x] T006 [P] Update `UpdateUserDto` in `apps/api/src/modules/users/dto/update-user.dto.ts` — make `address`, `username`, `phone` required, align with updated shared schema
- [x] T007 Update `UsersRepository.create()` in `apps/api/src/modules/users/users.repository.ts` — accept optional `password` parameter; if provided use it for `supabase.auth.admin.createUser()`, if omitted generate random password and send recovery link (existing behavior)
- [x] T008 Update `UsersService.create()` in `apps/api/src/modules/users/users.service.ts` — pass `password` from DTO through to repository `create()` method
- [x] T009 [P] Create `TenantsModule` with 4 files in `apps/api/src/modules/tenants/`: `tenants.module.ts`, `tenants.controller.ts` (GET /tenants, protected by JwtAuthGuard+TenantGuard+RolesGuard, @Roles super_admin/admin), `tenants.service.ts` (findAll — Super Admin sees all, Admin sees own tenant only), `tenants.repository.ts` (query `tenants` table ordered by name)
- [x] T010 Register `TenantsModule` in `apps/api/src/app.module.ts` imports array

**Checkpoint**: Backend API ready — all endpoints functional, shared schemas updated. Frontend refactoring can begin.

---

## Phase 3: User Story 1 — View and Search Users List via API (Priority: P1) MVP

**Goal**: Users list page fetches data exclusively from `GET /api/users` via TanStack Query — no Server Action calls.

**Independent Test**: Navigate to Catalogs > Users. Verify network tab shows `GET /api/users` requests. Confirm search, filter, sort, and pagination all trigger API calls with correct query parameters.

### Implementation for User Story 1

- [x] T011 [US1] Rewrite `apps/web/src/features/users/hooks/use-users.ts` — replace `getUsers()` Server Action import with `apiClient.get('/users', { params: filters })` call; update query key to `["users", tenantId, "list", filters]`
- [x] T012 [US1] Update `apps/web/src/features/users/components/users-table.tsx` — ensure it consumes the rewritten `useUsers` hook with loading/error states from TanStack Query
- [x] T013 [US1] Update `apps/web/src/features/users/components/user-filters.tsx` — wire search, status filter, and sort controls to update the TanStack Query filters (remove any Server Action dependencies)
- [x] T014 [US1] Update `apps/web/src/app/[locale]/(dashboard)/catalogs/users/page.tsx` — remove any direct Server Action imports; page should only render client components that use hooks

**Checkpoint**: Users list loads from API. Search, filter, sort, and pagination all work via API calls.

---

## Phase 4: User Story 2 — Create a New User via API (Priority: P1)

**Goal**: Create user form sends data to `POST /api/users` via TanStack Query mutation. Form includes password fields (optional), updated required fields, and status defaulting to "active".

**Independent Test**: Fill create user form, submit. Verify network tab shows `POST /api/users`. Test with and without password. Verify validation errors display from API responses.

### Implementation for User Story 2

- [x] T015 [US2] Rewrite `apps/web/src/features/users/hooks/use-create-user.ts` — replace `createUser()` Server Action with `apiClient.post('/users', data)` mutation; invalidate `["users"]` query key on success
- [x] T016 [US2] Update `apps/web/src/features/users/components/user-form.tsx` — add password and confirm password fields (optional); add informational label "A password reset link will be sent to the user's email" visible when password fields are empty; make address, username, phone required; pre-populate status field to "active"; add client-side password match validation via Zod refine
- [x] T017 [US2] Update `apps/web/src/features/users/components/create-user-page-client.tsx` — wire to rewritten `useCreateUser` hook; handle mutation loading/error states; redirect to users list on success with notification
- [x] T018 [US2] Update `apps/web/src/app/[locale]/(dashboard)/catalogs/users/new/page.tsx` — remove any Server Action imports; render client component only

**Checkpoint**: User creation works via API. Both password-provided and password-omitted flows succeed.

---

## Phase 5: User Story 3 — Edit an Existing User via API (Priority: P2)

**Goal**: Edit form loads user data from `GET /api/users/:id` and submits updates to `PUT /api/users/:id` via TanStack Query. Same required fields as create form (no password fields).

**Independent Test**: Click Edit on a user. Verify network tab shows `GET /api/users/:id` for data load and `PUT /api/users/:id` on save. Confirm required field validation on submit.

### Implementation for User Story 3

- [x] T019 [US3] Create `apps/web/src/features/users/hooks/use-get-user.ts` — new hook using `apiClient.get('/users/${id}')` with query key `["users", id]`; returns single `ExtendedUserProfile`
- [x] T020 [P] [US3] Rewrite `apps/web/src/features/users/hooks/use-update-user.ts` — replace `updateUser()` Server Action with `apiClient.put('/users/${id}', data)` mutation; invalidate `["users"]` and `["users", id]` query keys on success
- [x] T021 [US3] Update `apps/web/src/features/users/components/edit-user-page-client.tsx` — use `useGetUser` hook to fetch user data; use rewritten `useUpdateUser` hook for save; enforce same required fields as create form (address, username, phone required); handle loading/error states
- [x] T022 [US3] Update `apps/web/src/app/[locale]/(dashboard)/catalogs/users/[id]/edit/page.tsx` — remove any Server Action imports; render client component only

**Checkpoint**: Edit flow loads from API, saves via API. Required fields enforced. Cache invalidation updates the list.

---

## Phase 6: User Story 4 — Deactivate/Reactivate a User via API (Priority: P2)

**Goal**: Status toggle uses `PATCH /api/users/:id/status` via TanStack Query mutation. Confirmation dialog retained in frontend.

**Independent Test**: Click Deactivate on a user, confirm. Verify network tab shows `PATCH /api/users/:id/status`. Verify status changes in the list. Test reactivation.

### Implementation for User Story 4

- [x] T023 [US4] Create `apps/web/src/features/users/hooks/use-toggle-status.ts` — new mutation hook using `apiClient.patch('/users/${id}/status', { status })` ; invalidate `["users"]` query key on success; handle error display for self-deactivation and role hierarchy violations
- [x] T024 [US4] Update `apps/web/src/features/users/components/confirm-status-dialog.tsx` — wire to `useToggleStatus` hook; remove any Server Action dependency; show mutation loading state on confirm button
- [x] T025 [US4] Update `apps/web/src/features/users/components/users-table.tsx` — wire Deactivate/Reactivate action buttons to `useToggleStatus` hook through the confirm dialog

**Checkpoint**: Deactivate and reactivate work via API. Error messages display for forbidden operations.

---

## Phase 7: User Story 5 — Fetch User Groups via API (Priority: P3)

**Goal**: User groups multi-select on create/edit forms loads options from `GET /api/user-groups` via TanStack Query.

**Independent Test**: Open create or edit form. Verify network tab shows `GET /api/user-groups`. Confirm user groups appear in multi-select.

### Implementation for User Story 5

- [x] T026 [US5] Rewrite `apps/web/src/features/users/hooks/use-user-groups.ts` — replace `getUserGroups()` Server Action with `apiClient.get('/user-groups')` call; query key `["user-groups"]`; set `staleTime: 5 * 60 * 1000` (5 min, groups change infrequently)

**Checkpoint**: User groups dropdown loads from API on both create and edit forms.

---

## Phase 8: User Story 6 — Fetch Tenants List via API (Priority: P3)

**Goal**: Tenant selector on user form and tenant filter on users list load from `GET /api/tenants` via TanStack Query.

**Independent Test**: Open create user form as Super Admin. Verify network tab shows `GET /api/tenants`. Verify tenant dropdown populates. Check tenant filter on list page also uses API.

### Implementation for User Story 6

- [x] T027 [US6] Create `apps/web/src/features/users/hooks/use-tenants.ts` — new hook using `apiClient.get('/tenants')` with query key `["tenants"]`; set `staleTime: 5 * 60 * 1000` (tenants change infrequently)
- [x] T028 [US6] Update `apps/web/src/features/users/components/user-form.tsx` — wire tenant selector to `useTenants` hook instead of any Server Action or direct Supabase call
- [x] T029 [US6] Update `apps/web/src/features/users/components/user-filters.tsx` — wire tenant filter dropdown to `useTenants` hook

**Checkpoint**: Tenant data loads from API in both form selector and list filter.

---

## Phase 9: User Story 7 — Remove All Server Actions (Priority: P1)

**Goal**: Delete all Server Action files that used direct Supabase database access. Verify zero `supabase.from()` and zero `"use server"` in the users feature.

**Independent Test**: `grep -r "supabase.from\|\.rpc(\|\.storage" apps/web/src/features/users/` → zero results. `grep -r '"use server"' apps/web/src/features/users/` → zero results.

### Implementation for User Story 7

- [x] T030 [US7] Delete entire `apps/web/src/features/users/actions/` directory (6 files: `create-user.ts`, `get-users.ts`, `get-user.ts`, `get-user-groups.ts`, `update-user.ts`, `toggle-user-status.ts`)
- [x] T031 [US7] Verify no remaining imports from `actions/` in any file under `apps/web/src/features/users/` — fix any broken imports
- [x] T032 [US7] Run `grep -r "supabase.from\|\.rpc(\|\.storage" apps/web/src/features/users/` and `grep -r '"use server"' apps/web/src/features/users/` — confirm zero results

**Checkpoint**: All Server Actions removed. Feature operates exclusively through NestJS API endpoints.

---

## Phase 10: Testing & Polish

**Purpose**: Unit tests, E2E tests, type checking, linting, and final verification.

### Unit Tests

- [x] T033 [P] Write unit tests for `useUsers`, `useCreateUser`, `useUpdateUser`, `useToggleStatus` hooks in `apps/web/src/features/users/__tests__/` — mock `apiClient` responses, verify query keys, cache invalidation, error handling
- [ ] T034 [P] Write unit tests for `user-form.tsx` in `apps/web/src/features/users/__tests__/` — test password field rendering, password match validation, required field enforcement, status default to "active", password-empty label visibility
- [ ] T035 [P] Write unit tests for password handling in `apps/api/src/modules/users/__tests__/users.service.spec.ts` — test create with password provided vs omitted, verify repository receives correct args
- [ ] T036 [P] Write unit tests for `TenantsModule` in `apps/api/src/modules/tenants/__tests__/tenants.service.spec.ts` — test findAll returns all for super_admin, returns own for admin

### E2E Tests

- [ ] T037 Write Playwright E2E test for users CRUD flow in `apps/web/e2e/` — cover: list loads from API, create with password, create without password (reset link), edit user, deactivate, reactivate, search, filter, sort

### Final Verification

- [x] T038 Run `pnpm typecheck` — all workspaces pass
- [x] T039 Run `pnpm lint` — all workspaces pass
- [x] T040 Run `pnpm test` — all unit tests pass
- [x] T041 Run quickstart.md verification checklist — all 8 items confirmed via browser network tab

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phases 3-9)**: All depend on Foundational phase completion
  - US1 through US6 can proceed in parallel (different hooks/components)
  - US7 MUST come last (can only delete Server Actions after all hooks are rewritten)
- **Testing & Polish (Phase 10)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: After Foundational — no other story dependencies
- **US2 (P1)**: After Foundational — no other story dependencies (form is separate from table)
- **US3 (P2)**: After Foundational — shares `user-form.tsx` with US2, so US2 should complete first
- **US4 (P2)**: After Foundational — shares `users-table.tsx` with US1, so US1 should complete first
- **US5 (P3)**: After Foundational — updates hook only, no component dependencies
- **US6 (P3)**: After US2 (shares `user-form.tsx` tenant selector) and after US1 (shares `user-filters.tsx`)
- **US7 (P1)**: After US1-US6 all complete — deletion phase

### Within Each User Story

- Hooks before components (components depend on hook API)
- Core component before page wiring
- All implementation before verification

### Parallel Opportunities

**In Foundational phase**:
- T005 + T006 in parallel (different DTO files)
- T009 in parallel with T007/T008 (different modules)

**Across user stories (after Foundational)**:
- US1 + US2 in parallel (different hooks, different components)
- US5 in parallel with any other story (single hook file, no shared components)
- US3 + US4 can run in parallel if US1 and US2 are complete

**In Testing phase**:
- T033 + T034 + T035 + T036 all in parallel (different test files)

---

## Parallel Example: Foundational Phase

```text
# Sequential (same file):
T003: Update createUserSchema in packages/shared/src/validators/user.ts
T004: Update updateUserSchema in packages/shared/src/validators/user.ts

# Then parallel (different files):
Agent 1: T005 — Update CreateUserDto in apps/api/src/modules/users/dto/create-user.dto.ts
Agent 2: T006 — Update UpdateUserDto in apps/api/src/modules/users/dto/update-user.dto.ts
Agent 3: T009 — Create TenantsModule in apps/api/src/modules/tenants/

# Then sequential:
T007: Update UsersRepository.create() (depends on T005 for DTO shape)
T008: Update UsersService.create() (depends on T007)
T010: Register TenantsModule (depends on T009)
```

## Parallel Example: User Stories (after Foundational)

```text
# Two agents in parallel:
Agent 1: US1 (T011-T014) — View Users List
Agent 2: US2 (T015-T018) — Create User

# Then two more in parallel:
Agent 3: US3 (T019-T022) — Edit User (after US2 for shared form)
Agent 4: US4 (T023-T025) — Deactivate/Reactivate (after US1 for shared table)

# Then parallel:
Agent 5: US5 (T026) — User Groups hook
Agent 6: US6 (T027-T029) — Tenants hook + components

# Then cleanup:
US7 (T030-T032) — Remove Server Actions (all hooks must be done)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: US1 — View Users List via API
4. Complete Phase 4: US2 — Create User via API
5. **STOP and VALIDATE**: List and create work entirely through API
6. Users can view, search, filter, sort, and create users — core CRUD MVP

### Incremental Delivery

1. Setup + Foundational -> Backend ready
2. US1 -> List works via API (read path MVP)
3. US2 -> Create works via API (write path MVP)
4. US3 -> Edit works via API
5. US4 -> Deactivate/Reactivate works via API
6. US5 + US6 -> Supporting lookups via API
7. US7 -> Server Actions removed — migration complete
8. Tests + Polish -> Production ready

### Parallel Team Strategy

With 2 agents after Foundational:
- Agent A: US1 -> US4 -> US7 (table-focused path)
- Agent B: US2 -> US3 -> US5 + US6 (form-focused path)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently testable after completion
- US7 (Remove Server Actions) MUST be the last user story phase — cannot delete files still imported by unrewritten hooks
- Commit after each phase completion
- Stop at any checkpoint to validate independently
