# Tasks: Role-Based Navigation & Access Control

**Input**: Design documents from `/specs/005-role-based-navigation/`  
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested — test tasks omitted. Verification checklist in Phase 8.

**Organization**: Tasks grouped by user story. US5 (Centralized Session) is architecturally foundational for US1, US2, and US4 on web, so it is placed before them.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: No project initialization needed — existing monorepo. This phase ensures shared package exports are ready.

- [x] T001 Verify `packages/shared/src/types/auth.ts` exports Role and UserProfile types correctly (no changes expected)
- [x] T002 Verify `packages/shared/src/navigation/sidebar-config.ts` has getItemsForRole function and all sidebar items have correct role/platform assignments

---

## Phase 2: Foundational (Shared Package Utilities)

**Purpose**: Create shared utilities in `@ramcar/shared` and `@ramcar/ui` that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Create `extractUserProfile` utility in `packages/shared/src/utils/extract-user-profile.ts` — extract UserProfile from Supabase `user.app_metadata` fields (profile_id→id, tenant_id→tenantId, full_name→fullName, role→role with "resident" fallback). See contract: `specs/005-role-based-navigation/contracts/auth-utilities.ts`
- [x] T004 [P] Add route authorization utilities to `packages/shared/src/navigation/sidebar-config.ts` — add `UNIVERSAL_ROUTES` constant (`["/dashboard", "/account", "/unauthorized"]`), `getAllowedRoutes(role, platform)`, and `isRouteAllowedForRole(pathname, role, platform)` functions. See contract: `specs/005-role-based-navigation/contracts/auth-utilities.ts`
- [x] T005 [P] Create `LoadingScreen` component in `packages/ui/src/components/ui/loading-screen.tsx` — full-viewport centered spinner using Tailwind CSS animations only (`animate-spin` + brand colors), with timeout state (default 10s) showing "Taking longer than expected" message and retry button. Dark mode compatible. See contract: `specs/005-role-based-navigation/contracts/loading-screen.tsx`
- [x] T006 Update barrel exports: add `extractUserProfile` to `packages/shared/src/index.ts`, add `UNIVERSAL_ROUTES`, `getAllowedRoutes`, `isRouteAllowedForRole` to `packages/shared/src/navigation/index.ts`, add `LoadingScreen` to `packages/ui/src/index.ts`

**Checkpoint**: Shared utilities ready — user story implementation can begin

---

## Phase 3: User Story 5 — Centralized Session State Management (Priority: P5 — Architecturally Foundational)

**Goal**: Integrate the existing Zustand `@ramcar/store` into the web app so all client components share a single source of truth for user auth state. This is prerequisite for US1, US2, and US4 on web.

**Independent Test**: Navigate between dashboard pages on web — user state should be consistent across all components. Logout should immediately clear state and redirect.

### Implementation for User Story 5

- [x] T007 [US5] Modify dashboard layout `apps/web/src/app/[locale]/(dashboard)/layout.tsx` — after existing `supabase.auth.getUser()` call, import and call `extractUserProfile(user)` from `@ramcar/shared` to create a `UserProfile` object. Pass it as `userProfile` prop to `<DashboardShell userProfile={userProfile}>`. Keep existing redirect-to-login logic for missing user.
- [x] T008 [US5] Modify `apps/web/src/app/[locale]/(dashboard)/dashboard-shell.tsx` — accept `userProfile: UserProfile` prop. Wrap existing render tree in `<StoreProvider>` from `@ramcar/store`. Create internal `AuthGate` component that: (1) calls `setUser(userProfile)` via `useAppStore` on mount using `useEffect`, (2) renders `<LoadingScreen>` while `isLoading` is true, (3) renders children once `isAuthenticated` is true. See contract: `specs/005-role-based-navigation/contracts/web-auth-provider.tsx`
- [x] T009 [US5] Create unauthorized page at `apps/web/src/app/[locale]/(dashboard)/unauthorized/page.tsx` — display "Your account doesn't have access to this section. Please contact your administrator." message with logout button. Use next-intl translations. Simple centered card layout matching auth page styling.

**Checkpoint**: Web app now has centralized auth state via Zustand store. All subsequent web US phases can read user from `useAppStore((s) => s.user)`.

---

## Phase 4: User Story 1 — Role-Appropriate Sidebar Menu (Priority: P1) 🎯 MVP

**Goal**: Sidebar shows only menu items matching the authenticated user's role and platform. Applies to both web and desktop apps.

**Independent Test**: Log in as each of the 4 roles on both platforms. Verify only permitted menu items appear. Admin sees admin modules, Resident sees only resident modules, Guard on desktop sees patrol/access-log.

### Implementation for User Story 1

- [x] T010 [P] [US1] Modify web sidebar `apps/web/src/features/navigation/components/app-sidebar.tsx` — replace `getItemsForPlatform("web")` with role-based filtering: read `user` from `useAppStore((s) => s.user)`, compute items as `user ? getItemsForRole(user.role, "web") : []`. Import `getItemsForRole` from `@ramcar/shared` and `useAppStore` from `@ramcar/store`.
- [x] T011 [P] [US1] Modify desktop sidebar `apps/desktop/src/features/navigation/components/app-sidebar.tsx` — replace `getItemsForPlatform("desktop")` with role-based filtering: read `user` from `useAppStore((s) => s.user)` (already available), compute items as `user ? getItemsForRole(user.role, "desktop") : []`. Import `getItemsForRole` from `@ramcar/shared`.
- [x] T012 [P] [US1] Update desktop `apps/desktop/src/App.tsx` — remove local `extractUserProfile` function (lines 8-18), import `extractUserProfile` from `@ramcar/shared` instead. No other changes to auth flow.

**Checkpoint**: Both web and desktop sidebars filter menu items by user role. Each role sees only their permitted modules.

---

## Phase 5: User Story 2 — Smooth Post-Login Loading Experience (Priority: P2)

**Goal**: Display a polished loading animation after login and during page refresh, preventing content flashing while auth state resolves.

**Independent Test**: Log in on web and desktop — loading animation appears immediately after auth, transitions smoothly to full app view. Refresh page — brief loading screen prevents content flash.

### Implementation for User Story 2

- [x] T013 [US2] Enhance the `AuthGate` component in `apps/web/src/app/[locale]/(dashboard)/dashboard-shell.tsx` (created in T008) — ensure `<LoadingScreen>` renders as full-viewport overlay during initial hydration. Verify the transition from loading to content is smooth (no layout shift). Pass `onRetry={() => window.location.reload()}` to LoadingScreen for timeout recovery.
- [x] T014 [US2] Modify desktop `apps/desktop/src/App.tsx` — replace the existing basic loading spinner (lines 60-66) with `<LoadingScreen>` component from `@ramcar/ui`. Pass `onRetry` callback that re-triggers session check. Ensure loading screen shows during `isLoading: true` state.

**Checkpoint**: Both apps show a polished loading animation. No flash of empty content or incorrect menu items during login or page refresh.

---

## Phase 6: User Story 3 — Route-Level Access Protection (Priority: P3)

**Goal**: Block direct URL navigation to unauthorized routes. Redirect to dashboard (or unauthorized page for missing roles).

**Independent Test**: Log in as Resident on web, navigate to `/catalogs` via URL bar → redirected to `/dashboard`. Log in as Guard on desktop, attempt non-guard route → redirected to dashboard.

### Implementation for User Story 3

- [x] T015 [P] [US3] Modify web middleware `apps/web/src/middleware.ts` — after existing `user` check, extract `role` from `user.app_metadata?.role`. If `role` is missing and path is not `/unauthorized`, redirect to `${prefix}/unauthorized`. If role exists, call `isRouteAllowedForRole(path, role, "web")` from `@ramcar/shared`. If not allowed, redirect to `${prefix}/dashboard`. Import `Role` and `isRouteAllowedForRole` from `@ramcar/shared`.
- [x] T016 [P] [US3] Modify desktop page router `apps/desktop/src/shared/components/page-router.tsx` — read `user` from `useAppStore((s) => s.user)`. Before rendering the matched route component, check `isRouteAllowedForRole(currentPath, user.role, "desktop")`. If not allowed, call `navigate("/dashboard")` and render `DashboardPage`. Import `isRouteAllowedForRole` from `@ramcar/shared`.

**Checkpoint**: Unauthorized direct URL access is blocked on both platforms. Users can only reach pages their role permits.

---

## Phase 7: User Story 4 — Accurate User Identity Display (Priority: P4)

**Goal**: Sidebar footer shows the real logged-in user's name, email, and avatar initial instead of hardcoded "Admin" text.

**Independent Test**: Log in as different users on web — sidebar footer shows each user's actual name, email, and first initial in avatar.

### Implementation for User Story 4

- [x] T017 [US4] Modify web sidebar footer in `apps/web/src/features/navigation/components/app-sidebar.tsx` — replace hardcoded "Admin" / "admin@ramcar.com" (approximately lines 92-123) with dynamic data from Zustand store: read `user` from `useAppStore((s) => s.user)` (already imported in T010). Display `user?.fullName` for name, `user?.email` for email, `user?.fullName?.[0]?.toUpperCase()` for avatar initial. Handle null user gracefully (show empty or skeleton).

**Checkpoint**: Web sidebar shows real user data. Desktop sidebar already shows real user data (verify no regression).

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verification, cleanup, and edge case handling

- [x] T018 Run `pnpm typecheck` across all workspaces — fix any TypeScript errors introduced by changes
- [x] T019 Run `pnpm lint` across all workspaces — fix any ESLint violations
- [x] T020 Verify sidebar i18n translations still work correctly on both web (next-intl) and desktop (react-i18next) after role-based filtering changes
- [x] T021 Run full verification matrix from `specs/005-role-based-navigation/quickstart.md` — test all 4 roles on both platforms for sidebar filtering, route protection, loading screen, and user identity
- [x] T022 Test edge cases: user with no role in app_metadata (→ unauthorized page on web, restricted sidebar on desktop), logout (→ state cleared, redirect to login), page refresh (→ loading screen then correct state)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — verification only
- **Foundational (Phase 2)**: Depends on Phase 1 — creates shared utilities
- **US5 - Session State (Phase 3)**: Depends on Phase 2 (needs extractUserProfile, LoadingScreen) — BLOCKS US1, US2, US4 on web
- **US1 - Sidebar (Phase 4)**: Depends on Phase 3 (needs user in store for web) and Phase 2 (needs extractUserProfile for desktop)
- **US2 - Loading (Phase 5)**: Depends on Phase 3 (LoadingScreen already integrated in AuthGate, this phase enhances it)
- **US3 - Route Protection (Phase 6)**: Depends on Phase 2 only (needs isRouteAllowedForRole). Independent of Phases 3-5.
- **US4 - Identity (Phase 7)**: Depends on Phase 3 (needs user in store on web). Can parallel with US1.
- **Polish (Phase 8)**: Depends on all user story phases being complete

### User Story Dependencies

```
Phase 2 (Foundational)
    ├──→ Phase 3 (US5: Session State) ──┬──→ Phase 4 (US1: Sidebar)
    │                                    ├──→ Phase 5 (US2: Loading)
    │                                    └──→ Phase 7 (US4: Identity)
    └──→ Phase 6 (US3: Route Protection) ← independent of US5
```

- **US1 (P1)**: Depends on US5 for web, independent for desktop
- **US2 (P2)**: Depends on US5 (AuthGate already sets up loading)
- **US3 (P3)**: Independent — only needs foundational utilities
- **US4 (P4)**: Depends on US5 for web
- **US5 (P5)**: Foundational — no user story dependencies

### Within Each User Story

- Web and desktop tasks within a story are independent → can parallel
- Tasks modifying the same file must be sequential

### Parallel Opportunities

- **Phase 2**: T003, T004, T005 can all run in parallel (different packages)
- **Phase 4**: T010 (web sidebar) and T011 (desktop sidebar) and T012 (desktop App.tsx) can all run in parallel
- **Phase 6**: T015 (web middleware) and T016 (desktop page-router) can run in parallel
- **Cross-phase**: Phase 6 (US3) can run in parallel with Phases 4, 5, 7 (US1, US2, US4) since US3 only depends on Phase 2

---

## Parallel Example: User Story 1

```
# Launch all US1 implementation tasks together (they modify different files):
Task T010: Modify web sidebar → apps/web/src/features/navigation/components/app-sidebar.tsx
Task T011: Modify desktop sidebar → apps/desktop/src/features/navigation/components/app-sidebar.tsx
Task T012: Update desktop App.tsx → apps/desktop/src/App.tsx
```

## Parallel Example: Foundational

```
# Launch all foundational tasks together (different packages):
Task T003: extractUserProfile → packages/shared/src/utils/extract-user-profile.ts
Task T004: route authorization → packages/shared/src/navigation/sidebar-config.ts
Task T005: LoadingScreen → packages/ui/src/components/ui/loading-screen.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 — Sidebar Filtering)

1. Complete Phase 1: Setup (verification)
2. Complete Phase 2: Foundational (shared utilities)
3. Complete Phase 3: US5 — Centralized Session State (web StoreProvider)
4. Complete Phase 4: US1 — Role-Appropriate Sidebar Menu
5. **STOP and VALIDATE**: Log in as each role, verify sidebar filtering works
6. This delivers the core value — users see only their permitted modules

### Incremental Delivery

1. Setup + Foundational → Shared utilities ready
2. Add US5 (Session State) → Web has centralized auth
3. Add US1 (Sidebar) → **MVP!** Role-filtered menus on both platforms
4. Add US2 (Loading) → Polished loading experience
5. Add US3 (Route Protection) → Security hardened (can also run parallel with US1)
6. Add US4 (Identity) → Real user data in sidebar footer
7. Polish → Type checking, linting, full verification

### Parallel Team Strategy

With multiple developers after Phase 2 + Phase 3:

1. **Developer A**: US1 (Sidebar) + US4 (Identity) — both modify sidebar
2. **Developer B**: US3 (Route Protection) — independent, middleware + page-router
3. **Developer C**: US2 (Loading) — independent, polishing AuthGate and desktop loading

---

## Notes

- [P] tasks = different files, no dependencies between them
- [Story] label maps task to specific user story for traceability
- US5 is listed as P5 in the spec but is architecturally foundational — it must be implemented before US1, US2, US4 on web
- US3 (Route Protection) is the most independent story — only needs foundational utilities
- Desktop sidebar and web sidebar are always independent (different apps, different files)
- No database migrations or schema changes in this feature
- All new code must be TypeScript strict mode compliant
- Commit after each task or logical group
