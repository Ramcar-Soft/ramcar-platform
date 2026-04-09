# Implementation Plan: Fix Web Navigation Layout Not Rendering

**Branch**: `004-fix-web-nav-layout` | **Date**: 2026-04-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-fix-web-nav-layout/spec.md`

## Summary

After login, authenticated users land on `/` which resolves to the `(protected)` route group's `page.tsx` — a standalone page with no sidebar or topbar. The `DashboardShell` (sidebar + topbar) only wraps pages inside the `(dashboard)` route group. The fix is to remove the `(protected)` route group entirely and redirect the root authenticated route (`/`) into the `(dashboard)` route group so all authenticated pages render within the navigation shell.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)  
**Primary Dependencies**: Next.js 16 (App Router), next-intl v4, shadcn/ui, Zustand, Supabase Auth  
**Storage**: PostgreSQL via Supabase (auth only — no schema changes needed)  
**Testing**: Manual browser verification (no test framework configured yet)  
**Target Platform**: Web (localhost:3000 in development)  
**Project Type**: Web application (Next.js App Router monorepo)  
**Performance Goals**: N/A (bug fix, no performance impact)  
**Constraints**: Must preserve existing auth redirects, i18n routing, and all dashboard pages  
**Scale/Scope**: ~3 files changed, ~1 file deleted

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Tenant Isolation | N/A | No data queries involved — routing/layout change only |
| II. Feature-Based Architecture | PASS | Navigation components stay in `src/features/navigation/`; routing stays in `src/app/` |
| III. Strict Import Boundaries | PASS | `app/` imports from `features/` — no cross-feature imports introduced |
| IV. Offline-First Desktop | N/A | Web app only |
| V. Shared Validation via Zod | N/A | No validation changes |
| VI. Role-Based Access Control | N/A | Auth guard logic unchanged — only layout wrapping changes |
| VII. TypeScript Strict Mode | PASS | All files remain strictly typed |

**Result**: All gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/004-fix-web-nav-layout/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── spec.md              # Feature specification
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
apps/web/src/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/
│   │   │   ├── layout.tsx          # Unchanged — auth layout (no nav shell)
│   │   │   └── login/page.tsx      # Unchanged — login page
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx          # MODIFIED — add root redirect logic
│   │   │   ├── dashboard-shell.tsx # Unchanged — nav shell wrapper
│   │   │   ├── dashboard/page.tsx  # Unchanged — dashboard content
│   │   │   ├── account/page.tsx    # Unchanged
│   │   │   └── ... (all other pages)
│   │   ├── (protected)/            # DELETED — entire route group removed
│   │   │   ├── layout.tsx          # DELETED
│   │   │   └── page.tsx            # DELETED
│   │   └── layout.tsx              # Unchanged — locale provider
│   └── layout.tsx                  # Unchanged — root layout
├── features/
│   └── navigation/                 # Unchanged — sidebar, topbar, theme toggle
├── middleware.ts                    # MODIFIED — redirect `/` → `/dashboard`
└── shared/                         # Unchanged
```

**Structure Decision**: The fix removes the `(protected)` route group and modifies the middleware to redirect authenticated users from `/` to `/dashboard`. All authenticated pages live under `(dashboard)` which provides the `DashboardShell`.

## Complexity Tracking

> No violations — table not needed.

## Root Cause Analysis

### Current routing flow (broken)

```
User logs in → login action redirects to `/`
Middleware: user authenticated + not on /login → passes through
Next.js resolves `/[locale]/` → matches (protected)/page.tsx
(protected)/layout.tsx renders: plain <div> with LanguageSwitcher only
Result: user info card, NO sidebar, NO topbar
```

### Target routing flow (fixed)

```
User logs in → login action redirects to `/`
Middleware: user authenticated + path is `/` → redirect to `/dashboard`
Next.js resolves `/[locale]/dashboard` → matches (dashboard)/dashboard/page.tsx
(dashboard)/layout.tsx renders: DashboardShell (sidebar + topbar)
Result: dashboard page WITH sidebar and topbar
```

## Implementation Approach

### Step 1: Modify middleware to redirect `/` → `/dashboard`

**File**: `apps/web/src/middleware.ts`

After the existing auth redirect block (line 60-64), add a redirect for authenticated users hitting the root path (`/`) to `/dashboard`. This ensures `/` never resolves to the now-removed `(protected)` route group.

**Change**: When `user` is authenticated and `path === "/"`, redirect to `${prefix}/dashboard`.

### Step 2: Delete the `(protected)` route group

**Files to delete**:
- `apps/web/src/app/[locale]/(protected)/layout.tsx`
- `apps/web/src/app/[locale]/(protected)/page.tsx`

The `(protected)` route group served as the post-login landing page. With the middleware redirect to `/dashboard`, it is no longer needed. All its functionality (auth check, user info display) either moves to the dashboard or is already handled by the `(dashboard)/layout.tsx` auth guard.

### Step 3: Update login redirect target

**File**: `apps/web/src/features/auth/actions/login.ts`

Change `redirect({ href: "/", locale })` to `redirect({ href: "/dashboard", locale })` so users go directly to the dashboard after login, avoiding the middleware redirect hop.

### Step 4: Update middleware post-login redirect

**File**: `apps/web/src/middleware.ts`

Change the redirect target when an authenticated user is on `/login` from `prefix || "/"` to `${prefix}/dashboard` (line 62-63), so the middleware also sends users directly to dashboard.

### Step 5: Verify all dashboard pages render correctly

Manual verification: navigate to `/dashboard`, `/blacklist`, `/patrols`, `/logbook`, `/logbook/visitors`, `/account`, and confirm sidebar + topbar appear on every page. Verify `/login` does NOT show sidebar/topbar.

## Post-Phase 1 Constitution Re-Check

| Principle | Status | Notes |
|-----------|--------|-------|
| II. Feature-Based Architecture | PASS | `src/app/` contains routing only; nav components remain in `features/navigation/` |
| III. Strict Import Boundaries | PASS | No new cross-feature imports |
| VII. TypeScript Strict Mode | PASS | No type changes needed |

**Result**: All gates still pass after design.
