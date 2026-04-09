# Quickstart: 005-role-based-navigation

**Branch**: `005-role-based-navigation`

## Prerequisites

- Node.js 22 LTS
- pnpm installed
- Local Supabase running (`pnpm db:start`)
- At least one test user per role in Supabase auth with `app_metadata.role` set

## Setup

```bash
git checkout 005-role-based-navigation
pnpm install
```

## Test Users

To test role-based navigation, you need users with different roles. Set the role in Supabase auth `app_metadata`:

```sql
-- Run against local Supabase (port 54322)
-- Set a user's role to "admin"
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'admin@example.com';

-- Set a user's role to "guard"
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "guard"}'::jsonb
WHERE email = 'guard@example.com';

-- Set a user's role to "resident"
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "resident"}'::jsonb
WHERE email = 'resident@example.com';

-- Set a user's role to "super_admin"
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "super_admin"}'::jsonb
WHERE email = 'superadmin@example.com';
```

## Running

```bash
# Start all apps
pnpm dev

# Or start individually
pnpm --filter @ramcar/web dev      # Web app: http://localhost:3000
pnpm --filter @ramcar/desktop dev  # Desktop app (Electron)
```

## Files Modified/Created

### New Files

| File | Purpose |
|---|---|
| `packages/shared/src/utils/extract-user-profile.ts` | Extract UserProfile from Supabase auth metadata |
| `packages/ui/src/components/ui/loading-screen.tsx` | Shared loading animation component |
| `apps/web/src/app/[locale]/(dashboard)/unauthorized/page.tsx` | "Contact administrator" page for role-less users |

### Modified Files

| File | Change |
|---|---|
| `packages/shared/src/navigation/sidebar-config.ts` | Add `isRouteAllowedForRole()`, `getAllowedRoutes()`, `UNIVERSAL_ROUTES` |
| `packages/shared/src/navigation/index.ts` | Re-export new utilities |
| `packages/shared/src/index.ts` | Re-export `extractUserProfile` |
| `packages/ui/src/index.ts` | Export `LoadingScreen` |
| `apps/web/src/middleware.ts` | Add role-based route protection |
| `apps/web/src/app/[locale]/(dashboard)/layout.tsx` | Extract UserProfile, pass to shell |
| `apps/web/src/app/[locale]/(dashboard)/dashboard-shell.tsx` | Add StoreProvider, auth hydration, loading gate |
| `apps/web/src/features/navigation/components/app-sidebar.tsx` | Use `getItemsForRole()`, display real user data |
| `apps/desktop/src/App.tsx` | Use shared `extractUserProfile`, use `LoadingScreen` |
| `apps/desktop/src/features/navigation/components/app-sidebar.tsx` | Use `getItemsForRole()` instead of `getItemsForPlatform()` |
| `apps/desktop/src/shared/components/page-router.tsx` | Add role-based route guard |

## Verification Checklist

### Sidebar Filtering

- [ ] Log in as `super_admin` on web → see all 12 web modules
- [ ] Log in as `admin` on web → see all 12 web modules
- [ ] Log in as `resident` on web → see only dashboard, complaints, amenities, my-visits
- [ ] Log in as `guard` on web → see only dashboard (no web-specific guard items)
- [ ] Log in as `guard` on desktop → see dashboard, patrols, access-log
- [ ] Log in as `resident` on desktop → see only dashboard

### Route Protection

- [ ] As `resident` on web, navigate to `/catalogs` → redirected to `/dashboard`
- [ ] As `guard` on desktop, navigate to non-guard route → redirected to `/dashboard`
- [ ] Unauthenticated user → redirected to `/login`

### Loading Screen

- [ ] After login, loading animation appears before dashboard
- [ ] Page refresh shows brief loading screen
- [ ] Loading screen disappears smoothly once content is ready

### User Identity

- [ ] Web sidebar footer shows real user name and email (not "Admin")
- [ ] Desktop sidebar footer continues to show real user data

### Edge Cases

- [ ] User with no role in app_metadata → unauthorized page (web) / restricted (desktop)
- [ ] Logout clears state and redirects to login
