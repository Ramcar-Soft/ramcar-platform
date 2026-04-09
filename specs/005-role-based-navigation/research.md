# Research: 005-role-based-navigation

**Date**: 2026-04-09  
**Branch**: `005-role-based-navigation`

## R1: Supabase Client Pattern — Singleton vs Per-Call

### Decision: Keep current patterns (per-request server-side, module-level singleton for desktop)

### Rationale

- **Web server-side** (`createServerClient` from `@supabase/ssr`): Creates a new client per call. This is **correct by design** — each Next.js server request has its own cookie context, so a singleton would share cookies across requests (security bug). The `await cookies()` call binds the client to the current request lifecycle.
- **Web browser-side** (`createBrowserClient` from `@supabase/ssr`): Defined in `apps/web/src/shared/lib/supabase/client.ts` but currently unused (0 calls). `createBrowserClient` internally manages a singleton per origin — calling it multiple times returns the same instance. If we need browser-side Supabase in the future, calling `createClient()` is safe and idiomatic.
- **Desktop** (`createClient` from `@supabase/supabase-js`): Module-level export in `apps/desktop/src/shared/lib/supabase.ts`. ES module caching guarantees a single instance. This is correct for a long-lived Electron process.

### Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| Server-side singleton | Cookies are per-request; sharing client across requests leaks session state |
| Browser-side per-call without `@supabase/ssr` | `createBrowserClient` already handles deduplication internally |
| Shared Supabase wrapper package | Web and desktop have fundamentally different client creation needs (SSR cookies vs. direct client) — a shared wrapper would add complexity without benefit |

---

## R2: Web App Auth State Management Strategy

### Decision: Hydrate Zustand store from server-side user data via props

### Rationale

The web app currently has **no centralized auth state**. The Zustand store (`@ramcar/store` with `AuthSlice`) exists and is used by the desktop app but is not integrated into the web app. The pattern:

1. **Dashboard layout (server component)** already fetches the user via `supabase.auth.getUser()`.
2. Extract `UserProfile` from `user.app_metadata` (same as desktop's `extractUserProfile`).
3. Pass `UserProfile` as a prop to `DashboardShell` (client component).
4. `DashboardShell` wraps children in `StoreProvider` and hydrates the auth slice on mount.
5. All child client components (sidebar, future components) access user via `useAppStore`.

This approach:
- Reuses the existing `@ramcar/store` package (aligns with desktop pattern).
- Avoids client-side Supabase calls for initial auth (server already has the user).
- Is SSR-safe (data flows server → client via props, no `useEffect` fetch).
- Keeps the loading screen simple (show until store is hydrated).

### Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| Client-side `supabase.auth.getUser()` in a React Context | Adds redundant network call; server already has the user. Creates flash of unauthenticated state. |
| React Query for user state | CLAUDE.md states React Query is for server/async state; user profile is better as client state once fetched. Also adds unnecessary caching complexity for data that changes only on login/logout. |
| Pass user as prop through every component | Prop drilling doesn't scale; multiple components need user data at different tree depths. |

---

## R3: Route-to-Role Authorization Mapping

### Decision: Derive allowed routes from existing `sidebarItems` config

### Rationale

The `sidebarItems` array in `@ramcar/shared` already maps each route to its allowed roles and platforms. Rather than maintaining a separate route-permissions config, we derive authorization from this single source of truth:

1. Create a `isRouteAllowedForRole(pathname: string, role: Role, platform: Platform): boolean` utility in `@ramcar/shared`.
2. For each sidebar item, check if the pathname starts with the item's route.
3. If a matching item is found, verify the user's role is in the item's `roles` array.
4. Universal routes (e.g., `/dashboard`, `/account`) that aren't role-restricted are in a constant allowlist.
5. Routes not matching any sidebar item or allowlist entry are allowed (404 handling is separate).

### Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| Separate route-permissions config file | Dual maintenance with sidebar config; guaranteed drift over time |
| Hardcoded role checks per page | Violates constitution: "Role checks MUST NOT be hardcoded in business logic" |
| Backend-only enforcement | Constitution requires frontend to hide/protect UI elements; backend guards are defense-in-depth, not a substitute |

---

## R4: `extractUserProfile` Utility Location

### Decision: Move to `@ramcar/shared` as a shared utility

### Rationale

The `extractUserProfile()` function currently lives in `apps/desktop/src/App.tsx` (lines 8-18). The web app needs identical logic to extract `UserProfile` from Supabase `user.app_metadata`. Duplicating this function violates DRY and creates drift risk. Moving it to `@ramcar/shared` ensures:

- Single definition, used by both web (server-side in dashboard layout) and desktop (client-side in App.tsx).
- Type-safe: uses the existing `UserProfile` and `Role` types from the same package.
- Testable: can be unit tested independently.

The function signature: `extractUserProfile(user: { id: string; email?: string; app_metadata: Record<string, unknown> }): UserProfile`

---

## R5: Loading Screen Pattern

### Decision: Tailwind CSS animation in a dedicated loading component, no external libraries

### Rationale

- **Web**: The `DashboardShell` client component will show a full-screen loading animation until the Zustand store is hydrated with user data. Since the server component passes user data as props, hydration is near-instant — the loading screen primarily prevents the brief flash during React hydration.
- **Desktop**: Already has `isLoading` state in `App.tsx` with a basic spinner. Replace with the same polished loading component for visual consistency.
- **Animation**: Tailwind's built-in utilities (`animate-pulse`, `animate-spin`, custom keyframes) are sufficient. The project already uses Tailwind exclusively for styling.
- **Placement**: Create a shared `LoadingScreen` component in `@ramcar/ui` for cross-app reuse.
- **Timeout**: After 10 seconds, show a "taking longer than expected" message with retry button (per spec FR-007).

### Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| Framer Motion | Adds a dependency for a single animation; overkill for a loading spinner |
| Next.js `loading.tsx` convention | Only covers server component loading; we need to gate on client-side store hydration |
| Skeleton screens per page | Good for future enhancement but doesn't address the initial auth/role loading gap |

---

## R6: Web Middleware Role Check Integration

### Decision: Add role extraction and route validation to existing middleware

### Rationale

The web middleware (`apps/web/src/middleware.ts`) already:
1. Creates a Supabase server client per request.
2. Calls `supabase.auth.getUser()` to check authentication.
3. Handles locale prefix preservation in redirects.

Adding role checking is a natural extension:
1. After getting `user`, extract `role` from `user.app_metadata.role`.
2. Call `isRouteAllowedForRole(path, role, "web")` with the locale-stripped path.
3. If not allowed, redirect to `${prefix}/dashboard`.

This approach is efficient (no extra network call) and catches unauthorized access before the page renders.

**Important**: The middleware must handle the case where `role` is missing/null. Per spec FR-006, users without a role get the most restrictive access. In middleware, this means redirecting to a "contact administrator" page for any non-universal route.
