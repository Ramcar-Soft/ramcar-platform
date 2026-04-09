# Data Model: 005-role-based-navigation

**Date**: 2026-04-09  
**Branch**: `005-role-based-navigation`

## Entities

### UserProfile (existing — no changes)

**Source**: `packages/shared/src/types/auth.ts`

| Field | Type | Description |
|---|---|---|
| id | string | Profile ID from app_metadata (falls back to Supabase user ID) |
| userId | string | Supabase auth user ID |
| tenantId | string | Tenant association for multi-tenant isolation |
| email | string | User's email address |
| fullName | string | Display name |
| role | Role | Access level determining navigation and route permissions |

**Identity**: `userId` is unique per Supabase auth user. `id` is the application-level profile ID.

### Role (existing — no changes)

**Source**: `packages/shared/src/types/auth.ts`

Union type: `"super_admin" | "admin" | "guard" | "resident"`

**Hierarchy** (most to least privileged):
1. `super_admin` — Full access to all modules on all platforms
2. `admin` — Full access to all modules on assigned platforms (identical to super_admin for web)
3. `guard` — Desktop-focused: patrols, access logs
4. `resident` — Web/mobile-focused: complaints, amenities, personal visits

**Storage**: Stored in Supabase `user.app_metadata.role`. Set by administrators via backend. Read-only from the frontend perspective.

### SidebarItem (existing — no changes)

**Source**: `packages/shared/src/navigation/sidebar-config.ts`

| Field | Type | Description |
|---|---|---|
| key | string | Translation key and unique identifier |
| icon | string | Lucide icon name |
| route | string | URL path for navigation |
| subItems? | SidebarSubItem[] | Nested navigation items |
| roles | Role[] | Which roles can see/access this item |
| platforms | Platform[] | Which platforms show this item |

**Relationships**: Each SidebarItem maps to 1..4 Roles and 1..3 Platforms. The combination of `roles × platforms` determines visibility.

### AuthSlice (existing — no changes)

**Source**: `packages/store/src/slices/auth-slice.ts`

| Field | Type | Initial | Description |
|---|---|---|---|
| user | UserProfile \| null | null | Currently authenticated user profile |
| isLoading | boolean | true | Whether auth state is being resolved |
| isAuthenticated | boolean | false | Whether a valid user session exists |

**State Transitions**:

```
[App Start / Page Refresh]
  isLoading: true, user: null, isAuthenticated: false
    │
    ├─ (auth success) → setUser(profile)
    │   isLoading: false, user: UserProfile, isAuthenticated: true
    │
    ├─ (auth failure) → setLoading(false)
    │   isLoading: false, user: null, isAuthenticated: false
    │   → redirect to login
    │
    └─ (logout) → clearAuth()
        isLoading: false, user: null, isAuthenticated: false
        → redirect to login
```

**Actions**:
- `setUser(user: UserProfile)` — Sets user, marks authenticated, clears loading
- `setLoading(loading: boolean)` — Updates loading state only
- `clearAuth()` — Resets to unauthenticated state

## Data Flow

### Web App (Next.js)

```
Server Component (layout.tsx)
  │
  ├─ supabase.auth.getUser() → Supabase User
  ├─ extractUserProfile(user) → UserProfile
  │
  └─ Pass UserProfile as prop to DashboardShell (client component)
       │
       ├─ StoreProvider (creates Zustand store)
       │    └─ setUser(userProfile) → hydrates AuthSlice
       │
       └─ Child components read via useAppStore((s) => s.user)
            ├─ AppSidebar: getItemsForRole(user.role, "web")
            └─ Sidebar footer: user.fullName, user.email
```

### Desktop App (Electron)

```
App.tsx (root component)
  │
  ├─ supabase.auth.getSession() → Session
  ├─ extractUserProfile(session.user) → UserProfile
  ├─ supabase.auth.onAuthStateChange() → reactive updates
  │
  └─ StoreProvider (already integrated)
       └─ setUser(userProfile) → hydrates AuthSlice
            ├─ AppSidebar: getItemsForRole(user.role, "desktop")
            └─ PageRouter: isRouteAllowedForRole(path, user.role, "desktop")
```

### Route Authorization

```
Incoming Request (web middleware / desktop page-router)
  │
  ├─ Extract role from user.app_metadata.role
  │
  ├─ Is route in universal allowlist? (/dashboard, /account)
  │   └─ YES → Allow
  │
  ├─ Does any SidebarItem match route prefix?
  │   ├─ YES + role in item.roles → Allow
  │   ├─ YES + role NOT in item.roles → Deny → redirect to /dashboard
  │   └─ NO → Allow (not a restricted route)
  │
  └─ Is role missing/null?
      └─ YES → redirect to /unauthorized (web) or /dashboard (desktop)
```

## No Database Changes

This feature operates entirely on data already available in Supabase auth metadata (`user.app_metadata`). No migrations, no new tables, no RLS policy changes.
