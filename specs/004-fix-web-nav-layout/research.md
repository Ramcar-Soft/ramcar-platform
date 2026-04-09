# Research: Fix Web Navigation Layout Not Rendering

**Date**: 2026-04-08  
**Feature**: 004-fix-web-nav-layout

## Root Cause Investigation

### Decision: Root page resolves to wrong route group
- **Finding**: The root URL `/[locale]/` matches `(protected)/page.tsx` which uses a layout without `DashboardShell`. The `(dashboard)` route group (which has the sidebar + topbar via `DashboardShell`) is only activated for nested paths like `/dashboard`, `/blacklist`, etc.
- **Evidence**: 
  - `apps/web/src/app/[locale]/(protected)/layout.tsx` — renders a plain `<div>` with only a `LanguageSwitcher`
  - `apps/web/src/app/[locale]/(protected)/page.tsx` — renders user info card with full-screen centering
  - `apps/web/src/app/[locale]/(dashboard)/layout.tsx` — wraps children in `DashboardShell` (sidebar + topbar)
  - `apps/web/src/app/[locale]/(dashboard)/dashboard-shell.tsx` — contains `SidebarProvider`, `AppSidebar`, `TopBar`

### Decision: Fix by redirect + route group removal
- **Rationale**: The `(protected)` route group is redundant — its auth check is duplicated in `(dashboard)/layout.tsx`, and its page content (user info card) is a placeholder that should be the dashboard. Removing it and redirecting `/` → `/dashboard` is the cleanest fix.
- **Alternatives considered**:
  1. **Move DashboardShell to (protected) layout**: Rejected — would create two layouts rendering the same shell, violating DRY. The `(dashboard)` route group already handles all authenticated pages.
  2. **Add a page.tsx inside (dashboard) at root level**: Rejected — Next.js route groups at the same level with competing `page.tsx` files at the root cause ambiguity. A redirect is explicit and predictable.
  3. **Merge (protected) into (dashboard)**: This is effectively what we're doing — removing `(protected)` and letting `(dashboard)` own all authenticated routes.

### Decision: Redirect in middleware (not client-side)
- **Rationale**: The middleware already handles auth redirects (unauthenticated → `/login`, authenticated on `/login` → `/`). Adding the `/` → `/dashboard` redirect here keeps all routing logic centralized and avoids a flash of unstyled content.
- **Alternatives considered**:
  1. **Client-side redirect via `useRouter`**: Rejected — causes a visible page flash before redirect
  2. **Next.js `redirect()` in a root page.tsx**: Possible but adds an unnecessary file; middleware is already the routing authority

## No Unknowns Remaining

All NEEDS CLARIFICATION markers were resolved during specification. No further research needed.
