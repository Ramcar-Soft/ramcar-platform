# Tasks: Authentication — Web & Desktop

**Input**: Design documents from `/specs/001-auth-login/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-auth.md, quickstart.md

**Tests**: Not requested — manual verification via mock users.

**Organization**: Tasks grouped by user story. US1 (Web Login) and US2 (Desktop Login) are both P1 and can be implemented in parallel after foundational work. US3 (Mock Seeding) and US4 (Logout) are P2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- All file paths are relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies, create environment templates, and define shared types/validators used by all apps.

- [x] T001 Install Supabase dependencies: `pnpm --filter @ramcar/web add @supabase/supabase-js @supabase/ssr`, `pnpm --filter @ramcar/desktop add @supabase/supabase-js`, `pnpm --filter @ramcar/api add @supabase/supabase-js`
- [x] T002 [P] Create apps/web/.env.example with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
- [x] T003 [P] Create apps/desktop/.env.example with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- [x] T004 [P] Create apps/api/.env.example with SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, and PORT
- [x] T005 [P] Create shared auth types in packages/shared/src/types/auth.ts — export Role type (union: 'super_admin' | 'admin' | 'guard' | 'resident'), UserProfile interface (id, userId, tenantId, email, fullName, role), AuthSession interface
- [x] T006 [P] Create login Zod schema in packages/shared/src/validators/auth.ts — export loginSchema (email: z.string().email(), password: z.string().min(6))
- [x] T007 Update packages/shared/src/index.ts to re-export all types from types/auth and validators from validators/auth

---

## Phase 2: Foundational (Database & API Infrastructure)

**Purpose**: Create the database schema, seed mock users, and build the API auth infrastructure. **All user stories are blocked until this phase completes.**

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Database

- [x] T008 Create database migration in supabase/migrations/20260407000000_auth_schema.sql — create `tenants` table (id uuid PK, name text, slug text UNIQUE, created_at, updated_at), create `profiles` table (id uuid PK, user_id uuid UNIQUE FK→auth.users ON DELETE CASCADE, tenant_id uuid FK→tenants, full_name text, role text CHECK IN super_admin/admin/guard/resident, email text, created_at, updated_at), enable RLS on both tables, create RLS policies per data-model.md, create updated_at trigger function, create indexes (profiles_tenant_id_idx)
- [x] T009 Write supabase/seed.sql — insert test tenant "Residencial Demo" (slug: demo), insert 3 mock users into auth.users with bcrypt-hashed passwords (admin@ramcar.dev, guard@ramcar.dev, resident@ramcar.dev / password123), set app_metadata with tenant_id and role for each user, insert corresponding profiles rows linked to the test tenant
- [ ] T010 Run `pnpm db:reset` (DEFERRED — requires Docker/Supabase running) to apply migration and seed, then `pnpm db:types` to regenerate packages/db-types/src/types.ts — verify generated types include tenants and profiles tables

### API Infrastructure

- [x] T011 [P] Create apps/api/src/infrastructure/supabase/supabase.service.ts — injectable service wrapping Supabase client initialized with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from env, expose getClient() and getAdminClient() methods
- [x] T012 [P] Create apps/api/src/infrastructure/supabase/supabase.module.ts — global NestJS module that provides and exports SupabaseService
- [x] T013 [P] Create apps/api/src/common/decorators/roles.decorator.ts — @Roles() decorator using SetMetadata to attach required roles
- [x] T014 [P] Create apps/api/src/common/decorators/current-user.decorator.ts — @CurrentUser() parameter decorator extracting user from request
- [x] T015 [P] Create apps/api/src/common/decorators/current-tenant.decorator.ts — @CurrentTenant() parameter decorator extracting tenant_id from request
- [x] T016 Create apps/api/src/common/guards/jwt-auth.guard.ts — CanActivate guard that extracts Bearer token, calls supabase.auth.getUser(token) to verify, attaches user + app_metadata to request object
- [x] T017 [P] Create apps/api/src/common/guards/roles.guard.ts — CanActivate guard that reads @Roles() metadata and checks against user's role from request
- [x] T018 [P] Create apps/api/src/common/guards/tenant.guard.ts — CanActivate guard that extracts tenant_id from JWT app_metadata and attaches to request
- [x] T019 Create apps/api/src/modules/auth/auth.service.ts — injectable service with getProfile(userId, tenantId) method that queries profiles table, and logout(token) method that calls supabase.auth.admin.signOut(token)
- [x] T020 Create apps/api/src/modules/auth/auth.controller.ts — GET /auth/me (returns current user profile per contracts/api-auth.md), POST /auth/logout (server-side session invalidation), protected with JwtAuthGuard and TenantGuard
- [x] T021 Create apps/api/src/modules/auth/auth.module.ts — imports SupabaseModule, provides AuthService, declares AuthController
- [x] T022 Update apps/api/src/app.module.ts — import and register SupabaseModule (global) and AuthModule
- [x] T023 Update apps/api/src/main.ts — enable CORS (allow localhost:3000 and localhost:5173), set global validation pipe, set port from PORT env var (default 3001)

**Checkpoint**: Database seeded with mock users, API starts with auth endpoints, `GET /auth/me` returns 401 without token. Foundation ready.

---

## Phase 3: User Story 1 — Web Login (Priority: P1) 🎯 MVP

**Goal**: Any user (Admin, Guard, Resident) can log in to the web portal, see their name and role on the home page, and remain authenticated across page reloads.

**Independent Test**: Navigate to http://localhost:3000, get redirected to /login, enter admin@ramcar.dev / password123, see home page with "Admin" role displayed. Refresh — still authenticated.

### Implementation for User Story 1

- [x] T024 [P] [US1] Create browser Supabase client in apps/web/src/shared/lib/supabase/client.ts — export createClient() using createBrowserClient from @supabase/ssr with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
- [x] T025 [P] [US1] Create server Supabase client in apps/web/src/shared/lib/supabase/server.ts — export createClient() using createServerClient from @supabase/ssr with cookie handling via next/headers
- [x] T026 [P] [US1] Create middleware Supabase client in apps/web/src/shared/lib/supabase/middleware.ts — export updateSession(request) function using createServerClient with request/response cookie handling
- [x] T027 [US1] Create Next.js middleware in apps/web/middleware.ts — call updateSession() on every request, redirect unauthenticated users to /login for protected routes, redirect authenticated users away from /login to /, configure matcher to exclude static assets and API routes
- [x] T028 [US1] Create login server action in apps/web/src/features/auth/actions/login.ts — 'use server' action that validates input with loginSchema from @ramcar/shared, calls supabase.auth.signInWithPassword(), returns error or redirects to /
- [x] T029 [US1] Create logout server action in apps/web/src/features/auth/actions/logout.ts — 'use server' action that calls supabase.auth.signOut() and redirects to /login
- [x] T030 [US1] Create LoginForm client component in apps/web/src/features/auth/components/login-form.tsx — 'use client' form with email and password inputs (using @ramcar/ui Input and Button), calls login server action, displays error messages, loading state
- [x] T031 [US1] Create login page in apps/web/src/app/(auth)/login/page.tsx — renders LoginForm centered on page with app branding
- [x] T032 [US1] Create protected layout in apps/web/src/app/(protected)/layout.tsx — server component that checks session via server Supabase client, redirects to /login if no session, passes user data to children
- [x] T033 [US1] Create temporary home page in apps/web/src/app/(protected)/page.tsx — displays user's full name, email, and role from session, includes logout button calling logout server action, uses @ramcar/ui Card component for layout
- [x] T034 [US1] Update root layout in apps/web/src/app/layout.tsx — remove default Next.js boilerplate content, keep metadata and font setup

**Checkpoint**: Web login flow works end-to-end. All 3 mock users can log in, see their role, refresh without losing session, and log out.

---

## Phase 4: User Story 2 — Desktop Login (Priority: P1)

**Goal**: Any user can log in to the Electron desktop app, see their name and role on the home screen, and remain authenticated across app restarts.

**Independent Test**: Launch desktop app, see login screen, enter guard@ramcar.dev / password123, see home screen with "Guard" role. Close and reopen app — still authenticated.

### Implementation for User Story 2

- [x] T035 [P] [US2] Create Supabase client utility in apps/desktop/src/shared/lib/supabase.ts — export singleton createClient() using createClient from @supabase/supabase-js with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, uses localStorage for session persistence
- [x] T036 [P] [US2] Create auth slice in packages/store/src/slices/auth-slice.ts — export AuthSlice type and createAuthSlice with state: user (UserProfile | null), session (AuthSession | null), isLoading (boolean), isAuthenticated (boolean); actions: login(email, password), logout(), initialize() (check existing session), setUser(), clearAuth()
- [x] T037 [US2] Update packages/store/src/store.ts to compose auth slice into the app store, and update packages/store/src/index.ts to export auth-related types and selectors
- [x] T038 [US2] Create LoginForm component in apps/desktop/src/features/auth/components/login-form.tsx — email and password inputs using @ramcar/ui Input and Button, calls store login action, displays error messages, loading state, validates with loginSchema from @ramcar/shared
- [x] T039 [US2] Create LoginPage in apps/desktop/src/features/auth/pages/login-page.tsx — renders LoginForm centered on screen with app branding
- [x] T040 [US2] Create HomePage in apps/desktop/src/features/auth/pages/home-page.tsx — displays user's full name, email, and role from store, includes logout button that calls store logout action, uses @ramcar/ui Card component
- [x] T041 [US2] Update apps/desktop/src/App.tsx — on mount call store initialize() to check existing session, show loading spinner while checking, render LoginPage if not authenticated or HomePage if authenticated, listen for auth state changes
- [x] T042 [US2] Update apps/desktop/src/env.d.ts — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to ImportMetaEnv interface

**Checkpoint**: Desktop login flow works end-to-end. All 3 mock users can log in, see their role, close and reopen app without losing session, and log out.

---

## Phase 5: User Story 3 — Mock User Seeding Verification (Priority: P2)

**Goal**: Developers can seed mock users with a single command and find documented credentials.

**Independent Test**: Run `pnpm db:reset`, then log in with each of the 3 mock users on both web and desktop.

### Implementation for User Story 3

- [ ] T043 [US3] Verify end-to-end seeding (MANUAL — requires Docker/Supabase running): run `pnpm db:reset`, confirm 3 users in auth.users and profiles tables via `pnpm supabase db dump` or Supabase Studio, log in with admin@ramcar.dev, guard@ramcar.dev, and resident@ramcar.dev on web — all should succeed and display correct role

**Checkpoint**: Mock user seeding is reproducible and documented. Any developer can set up locally with `pnpm db:reset` and immediately test.

---

## Phase 6: User Story 4 — Logout Verification (Priority: P2)

**Goal**: After logout, session is destroyed and protected content is inaccessible on both platforms.

**Independent Test**: Log in on web, click logout, try to visit / — should redirect to /login. Same for desktop.

### Implementation for User Story 4

- [ ] T044 [US4] Verify web logout (MANUAL — requires running apps): log in on web, click logout, confirm redirect to /login, navigate to / directly — should redirect back to /login, check that session cookie is cleared
- [ ] T045 [US4] Verify desktop logout (MANUAL — requires running apps): log in on desktop, click logout, confirm login screen appears, close and reopen app — should show login screen (session cleared from localStorage)

**Checkpoint**: Logout works on both platforms. Session is fully destroyed. Protected content cannot be accessed after logout.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validate everything builds, passes lint, and types check across the monorepo.

- [x] T046 Run `pnpm lint` across all workspaces — fix any ESLint errors in new files
- [x] T047 Run `pnpm typecheck` across all workspaces — fix any TypeScript errors
- [x] T048 Run `pnpm build` across all workspaces — verify all apps and packages build successfully

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — **BLOCKS all user stories**
- **US1 Web Login (Phase 3)**: Depends on Foundational completion
- **US2 Desktop Login (Phase 4)**: Depends on Foundational completion
- **US3 Seeding Verification (Phase 5)**: Depends on US1 or US2 (needs a login UI to verify)
- **US4 Logout Verification (Phase 6)**: Depends on US1 and US2 (needs both platforms to verify)
- **Polish (Phase 7)**: Depends on all implementation phases

### User Story Dependencies

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Foundational) ← BLOCKS ALL
    │
    ├──────────────┐
    ▼              ▼
Phase 3 (US1)  Phase 4 (US2)   ← CAN RUN IN PARALLEL
    │              │
    └──────┬───────┘
           ▼
    Phase 5 (US3) + Phase 6 (US4)
           │
           ▼
    Phase 7 (Polish)
```

### Within Each User Story

- Supabase client utilities before middleware/actions that use them
- Server actions/store actions before components that call them
- Components before pages that compose them
- Pages before layout/routing that references them

### Parallel Opportunities

**Phase 1**: T002, T003, T004 in parallel (env files); T005, T006 in parallel (shared types)
**Phase 2**: T011, T012 in parallel with T013, T014, T015 (infrastructure vs decorators); T017, T018 in parallel (guards)
**Phase 3 + Phase 4**: US1 and US2 are fully independent and can run in parallel after Phase 2
**Within US1**: T024, T025, T026 in parallel (three Supabase client utilities)
**Within US2**: T035, T036 in parallel (Supabase client + auth slice in different packages)

---

## Parallel Example: Phase 3 + Phase 4

```bash
# After Phase 2 completes, launch both user stories simultaneously:

# Agent A: US1 — Web Login
Task: T024 "Create browser Supabase client in apps/web/src/shared/lib/supabase/client.ts"
Task: T025 "Create server Supabase client in apps/web/src/shared/lib/supabase/server.ts"
Task: T026 "Create middleware Supabase client in apps/web/src/shared/lib/supabase/middleware.ts"
# ... continues through T034

# Agent B: US2 — Desktop Login
Task: T035 "Create Supabase client utility in apps/desktop/src/shared/lib/supabase.ts"
Task: T036 "Create auth slice in packages/store/src/slices/auth-slice.ts"
# ... continues through T042
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (Web Login)
4. **STOP and VALIDATE**: Test web login with all 3 mock users
5. This alone provides a usable login for the web portal

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. Add US1 (Web Login) → Test → **MVP delivered**
3. Add US2 (Desktop Login) → Test → Both platforms have auth
4. Verify US3 (Seeding) + US4 (Logout) → Full feature validated
5. Polish → Clean, buildable, lintable codebase

### Parallel Strategy

With 2 agents after Phase 2:
- **Agent A**: US1 (Web Login) — 11 tasks
- **Agent B**: US2 (Desktop Login) — 8 tasks
- Both complete independently, then verify US3 + US4 together

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Logout functionality is built into US1 (T029 server action) and US2 (T040 HomePage) — US4 phase is verification only
- Seed data (T009) is in Foundational because it's a prerequisite for testing any login flow
- The desktop app uses Supabase client in the renderer (not main process IPC) per research Decision 3 — simplest approach, localStorage persistence works in Electron
- No automated tests in this feature — manual verification via mock users per plan.md
- All validation uses shared Zod schemas from @ramcar/shared per Constitution Principle V
