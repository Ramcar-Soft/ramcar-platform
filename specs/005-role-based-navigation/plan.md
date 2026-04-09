# Implementation Plan: Role-Based Navigation & Access Control

**Branch**: `005-role-based-navigation` | **Date**: 2026-04-09 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/005-role-based-navigation/spec.md`

## Summary

Implement role-based navigation filtering and route protection across the web and desktop apps. The sidebar menu will show only items permitted for the authenticated user's role. A loading screen prevents content flashing during auth state resolution. Route-level guards block direct URL access to unauthorized pages. The web app gains centralized auth state management via the existing Zustand store (already used by desktop). The `extractUserProfile` utility moves to `@ramcar/shared` for cross-app reuse.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)  
**Primary Dependencies**: Next.js 16 (App Router), Electron 30 + Vite + React 18, Zustand, @supabase/ssr, @supabase/supabase-js, next-intl v4, Tailwind CSS  
**Storage**: PostgreSQL via Supabase (auth metadata only — no schema changes)  
**Testing**: Manual verification per role/platform matrix (4 roles × 2 platforms)  
**Target Platform**: Web (Next.js SSR) + Desktop (Electron)  
**Project Type**: Multi-app monorepo (web-service + desktop-app)  
**Performance Goals**: Loading screen visible <200ms after auth; sidebar renders in <100ms after hydration  
**Constraints**: No external animation libraries; Tailwind CSS only. No database migrations. No changes to auth flow.  
**Scale/Scope**: 4 roles, 2 platforms, 17 sidebar items, ~15 protected routes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Multi-Tenant Isolation | ✅ PASS | No new DB queries. UserProfile includes tenantId from auth metadata. |
| II. Feature-Based Architecture | ✅ PASS | New auth hook goes in `src/features/auth/` (web) or `src/shared/` (web). New loading component in `@ramcar/ui`. Route utility in `@ramcar/shared`. |
| III. Strict Import Boundaries | ✅ PASS | Navigation reads user from Zustand store (shared package), not from auth feature directly. No cross-feature imports. |
| IV. Offline-First Desktop | ✅ PASS | No changes to offline/sync behavior. Auth state already in Zustand store. |
| V. Shared Validation via Zod | ✅ PASS | No new validation schemas needed. Existing `loginSchema` unchanged. |
| VI. Role-Based Access Control | ✅ DIRECTLY ALIGNED | This feature implements frontend RBAC. Uses `@Roles()` pattern conceptually — roles defined in shared config, enforced in middleware/guards. |
| VII. TypeScript Strict Mode | ✅ PASS | All new code is TypeScript strict. No `any` types. |

**Post-Phase 1 Re-check**: All gates still pass. No new dependencies, no new database access, no cross-feature imports.

## Project Structure

### Documentation (this feature)

```text
specs/005-role-based-navigation/
├── plan.md              # This file
├── research.md          # Phase 0 output — technical decisions
├── data-model.md        # Phase 1 output — entities & state
├── quickstart.md        # Phase 1 output — dev guide
├── contracts/           # Phase 1 output — interface contracts
│   ├── auth-utilities.ts    # extractUserProfile + route authorization
│   ├── loading-screen.tsx   # LoadingScreen component contract
│   └── web-auth-provider.tsx # StoreProvider + hydration contract
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
packages/shared/src/
├── types/auth.ts                    # (existing) Role, UserProfile — no changes
├── navigation/sidebar-config.ts     # (existing) add isRouteAllowedForRole() + getAllowedRoutes()
├── navigation/index.ts              # (existing) re-export new utilities
└── utils/
    └── extract-user-profile.ts      # (new) moved from desktop App.tsx

packages/ui/src/components/ui/
└── loading-screen.tsx               # (new) shared Tailwind loading animation

packages/store/src/
└── slices/auth-slice.ts             # (existing) no changes needed

apps/web/src/
├── middleware.ts                     # (modify) add role-based route protection
├── app/[locale]/(dashboard)/
│   ├── layout.tsx                   # (modify) extract UserProfile, pass to shell
│   ├── dashboard-shell.tsx          # (modify) add StoreProvider + auth hydration + loading gate
│   └── unauthorized/
│       └── page.tsx                 # (new) "contact administrator" page for missing roles
├── features/navigation/
│   └── components/app-sidebar.tsx   # (modify) use getItemsForRole + real user data from store
└── shared/lib/supabase/
    ├── server.ts                    # (existing) no changes
    └── client.ts                    # (existing) no changes

apps/desktop/src/
├── App.tsx                          # (modify) use shared extractUserProfile, enhance loading
├── features/navigation/
│   └── components/app-sidebar.tsx   # (modify) use getItemsForRole instead of getItemsForPlatform
└── shared/components/
    └── page-router.tsx              # (modify) add role-based route guard
```

**Structure Decision**: Follows existing monorepo structure. New utilities go in shared packages for cross-app reuse. Feature-specific changes stay within each app's existing feature directories.

## Complexity Tracking

No constitution violations to justify.

## Implementation Phases

### Phase A: Shared Utilities (packages/shared, packages/ui)

**Goal**: Build the shared foundation that both apps depend on.

#### A1. Create `extractUserProfile` utility in `@ramcar/shared`

**File**: `packages/shared/src/utils/extract-user-profile.ts` (new)

Move the `extractUserProfile` function from `apps/desktop/src/App.tsx` (lines 8-18) to the shared package. The function maps Supabase `user.app_metadata` fields to the existing `UserProfile` interface.

**Key behavior**:
- Maps `app_metadata.profile_id` → `id` (falls back to `user.id`)
- Maps `app_metadata.tenant_id` → `tenantId`
- Maps `app_metadata.full_name` → `fullName`
- Maps `app_metadata.role` → `role` (falls back to `"resident"`)
- Re-export from `packages/shared/src/index.ts`

#### A2. Create route authorization utility in `@ramcar/shared`

**File**: `packages/shared/src/navigation/sidebar-config.ts` (modify)

Add two functions:

1. `getAllowedRoutes(role: Role, platform: Platform): string[]` — returns all route prefixes the role can access on the given platform. Derived from `sidebarItems.filter(...)`.

2. `isRouteAllowedForRole(pathname: string, role: Role, platform: Platform): boolean` — checks if a given pathname is allowed:
   - Universal routes (`/dashboard`, `/account`) → always allowed for any authenticated user
   - For each sidebar item matching the platform: if pathname starts with item.route, check if role is in item.roles
   - Routes not matching any sidebar item → allowed (not restricted, may be 404)

Re-export from `packages/shared/src/navigation/index.ts` and `packages/shared/src/index.ts`.

#### A3. Create `LoadingScreen` component in `@ramcar/ui`

**File**: `packages/ui/src/components/ui/loading-screen.tsx` (new)

A full-viewport loading animation using Tailwind CSS classes only:
- Centered spinner/pulse animation with the Ramcar logo or brand color
- Uses `animate-spin` or custom Tailwind keyframe
- Accepts optional `timeout` prop (default 10s) after which it shows "Taking longer than expected" message with a retry button
- Accepts optional `onRetry` callback
- Export from `packages/ui/src/index.ts`

### Phase B: Web App — Auth State & Loading (apps/web)

**Goal**: Integrate centralized auth state and loading screen into the web app.

#### B1. Modify dashboard layout to extract and pass UserProfile

**File**: `apps/web/src/app/[locale]/(dashboard)/layout.tsx` (modify)

Current behavior: Fetches `user` via `supabase.auth.getUser()`, checks existence, renders `<DashboardShell>`.

New behavior:
1. After getting `user`, call `extractUserProfile(user)` to get `UserProfile`.
2. Pass `userProfile` as a prop to `<DashboardShell userProfile={userProfile}>`.
3. Handle edge case: if `user` exists but `app_metadata.role` is missing/null, the `extractUserProfile` function returns `role: "resident"` as fallback. The middleware will handle redirect for truly role-less users.

#### B2. Modify DashboardShell to add StoreProvider and loading gate

**File**: `apps/web/src/app/[locale]/(dashboard)/dashboard-shell.tsx` (modify)

Current behavior: Renders `TooltipProvider > SidebarProvider > AppSidebar + SidebarInset`.

New behavior:
1. Accept `userProfile: UserProfile` prop.
2. Wrap everything in `<StoreProvider>`.
3. Inside StoreProvider, render a new inner component `<AuthenticatedShell userProfile={userProfile}>` that:
   - On mount, calls `useAppStore` → `setUser(userProfile)` to hydrate the auth slice.
   - While `isLoading` is true in the store (before hydration), renders `<LoadingScreen>`.
   - After hydration, renders the sidebar + content layout.
4. This ensures the store is hydrated before any child component reads from it.

#### B3. Create unauthorized page

**File**: `apps/web/src/app/[locale]/(dashboard)/unauthorized/page.tsx` (new)

Simple page displayed when a user has no role or an invalid role:
- Message: "Your account doesn't have access to this section. Please contact your administrator."
- Link to logout
- Translatable via next-intl

### Phase C: Web App — Sidebar & Route Protection (apps/web)

**Goal**: Filter sidebar by role and protect routes.

#### C1. Modify web sidebar to use role-based filtering

**File**: `apps/web/src/features/navigation/components/app-sidebar.tsx` (modify)

Current behavior: `const items = getItemsForPlatform("web")` — shows all web items.

New behavior:
1. Read user from Zustand store: `const user = useAppStore((s) => s.user)`.
2. Compute items: `const items = user ? getItemsForRole(user.role, "web") : []`.
3. Replace hardcoded "Admin" / "admin@ramcar.com" in sidebar footer with `user?.fullName` and `user?.email`.
4. Replace hardcoded avatar initial "A" with `user?.fullName?.[0]`.

#### C2. Add role-based route protection to middleware

**File**: `apps/web/src/middleware.ts` (modify)

Current behavior: Checks `user` existence, redirects unauthenticated to `/login`.

New behavior (after the existing auth check):
1. Extract role: `const role = user.app_metadata?.role as Role | undefined`.
2. If `role` is missing/undefined and path is not `/unauthorized`: redirect to `${prefix}/unauthorized`.
3. If role exists: call `isRouteAllowedForRole(path, role, "web")`.
4. If not allowed: redirect to `${prefix}/dashboard`.
5. Import `Role` from `@ramcar/shared` and `isRouteAllowedForRole` from `@ramcar/shared`.

### Phase D: Desktop App — Sidebar & Route Protection (apps/desktop)

**Goal**: Apply role-based filtering and route guards to the desktop app.

#### D1. Update desktop App.tsx to use shared extractUserProfile

**File**: `apps/desktop/src/App.tsx` (modify)

1. Remove the local `extractUserProfile` function (lines 8-18).
2. Import `extractUserProfile` from `@ramcar/shared`.
3. Replace the loading spinner with `<LoadingScreen>` from `@ramcar/ui`.
4. No other changes to auth flow (already correct).

#### D2. Modify desktop sidebar to use role-based filtering

**File**: `apps/desktop/src/features/navigation/components/app-sidebar.tsx` (modify)

Current behavior: `const items = getItemsForPlatform("desktop")` — shows all desktop items.

New behavior:
1. Read user from store: `const user = useAppStore((s) => s.user)`.
2. Compute items: `const items = user ? getItemsForRole(user.role, "desktop") : []`.

#### D3. Add role-based route guard to page router

**File**: `apps/desktop/src/shared/components/page-router.tsx` (modify)

Current behavior: Maps `currentPath` to a component and renders it. No role checks.

New behavior:
1. Read user from store: `const user = useAppStore((s) => s.user)`.
2. Before rendering the matched route component, check `isRouteAllowedForRole(currentPath, user.role, "desktop")`.
3. If not allowed, call `navigate("/dashboard")` and render `DashboardPage`.

### Phase E: Verification & Polish

#### E1. Manual verification matrix

Test all 4 roles × 2 platforms:

| Role | Platform | Expected Sidebar Items | Unauthorized Route Test |
|---|---|---|---|
| super_admin | web | All 12 web items | N/A (has access to all) |
| admin | web | All 12 web items | N/A (same as super_admin for web) |
| guard | web | dashboard only | /catalogs → redirect to /dashboard |
| resident | web | dashboard, complaints, amenities, my-visits | /catalogs → redirect to /dashboard |
| super_admin | desktop | dashboard, patrols, access-log | N/A |
| admin | desktop | dashboard, patrols | /access-log → redirect to /dashboard |
| guard | desktop | dashboard, patrols, access-log | N/A (has all desktop items) |
| resident | desktop | dashboard only | /patrols → redirect to /dashboard |

#### E2. Loading screen verification

- Login as any user → loading screen appears → transitions to sidebar + content
- Refresh page → brief loading screen → content appears
- Simulate slow connection → loading screen persists → timeout message after 10s

#### E3. Edge case verification

- User with no role in app_metadata → redirected to unauthorized page (web) / restricted to dashboard (desktop)
- Direct URL to unauthorized route → redirect to dashboard
- Logout → all state cleared, redirect to login

## Dependency Graph

```
A1 (extractUserProfile) ──┬──→ B1 (layout passes profile)
                          │
A2 (route authorization) ─┼──→ C2 (web middleware)
                          │    D3 (desktop page-router)
                          │
A3 (LoadingScreen) ───────┼──→ B2 (DashboardShell)
                          │    D1 (desktop App.tsx)
                          │
                          ├──→ B2 (DashboardShell + StoreProvider) ──→ C1 (sidebar filtering)
                          │
                          └──→ B3 (unauthorized page)

Phase A (shared) → Phase B (web auth) → Phase C (web sidebar/routes)
Phase A (shared) → Phase D (desktop)
Phase E depends on all above
```

Phase B and Phase D are independent of each other and can be worked in parallel after Phase A completes.
