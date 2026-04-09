# Quickstart: Fix Web Navigation Layout Not Rendering

**Branch**: `004-fix-web-nav-layout`

## Problem

After login, users land on `/` which renders a standalone page (user info card) with no sidebar or topbar. The navigation shell only appears on pages nested under `(dashboard)/`.

## Fix (4 changes)

### 1. Middleware: redirect authenticated `/` → `/dashboard`

In `apps/web/src/middleware.ts`, after the authenticated-on-login redirect block, add:

```typescript
if (user && path === "/") {
  const url = request.nextUrl.clone();
  url.pathname = `${prefix}/dashboard`;
  return NextResponse.redirect(url);
}
```

Also update the existing authenticated-on-login redirect to target `/dashboard`:
```typescript
url.pathname = `${prefix}/dashboard`;
```

### 2. Login action: redirect to `/dashboard`

In `apps/web/src/features/auth/actions/login.ts`, change:
```typescript
return redirect({ href: "/dashboard", locale });
```

### 3. Delete `(protected)` route group

Remove entirely:
- `apps/web/src/app/[locale]/(protected)/layout.tsx`
- `apps/web/src/app/[locale]/(protected)/page.tsx`

### 4. Verify

```bash
pnpm dev  # Start dev server
# Navigate to localhost:3000 — should redirect to /dashboard with sidebar + topbar
# Navigate to /login — should NOT show sidebar/topbar
# Navigate to /blacklist, /patrols, /logbook — all should show sidebar + topbar
```

## Files Changed

| File | Action |
|------|--------|
| `apps/web/src/middleware.ts` | Modified (add root redirect, update login redirect target) |
| `apps/web/src/features/auth/actions/login.ts` | Modified (redirect to `/dashboard`) |
| `apps/web/src/app/[locale]/(protected)/layout.tsx` | Deleted |
| `apps/web/src/app/[locale]/(protected)/page.tsx` | Deleted |
