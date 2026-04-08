# Login Page Styling Design

## Problem

The login page at `apps/web` renders on a plain white background with no visual contrast against the Card component. The shadcn theme (Luma style, Mist base color, Green theme) is configured in `packages/ui/src/globals.css` but is not being applied to create the intended design aesthetic. The Sign In button uses `variant="outline"` instead of the primary green.

## Goal

Match the shadcn theme reference: muted gray page background, white card with border and shadow for contrast, green primary button.

## Approach: Auth Layout with `bg-muted` + Enhanced Card Shadow

### 1. Root layout — theme-aware body

**File:** `apps/web/src/app/layout.tsx`

Add `bg-background text-foreground` to the `<body>` element. This ensures all pages across the app inherit the theme's base colors.

### 2. Auth layout — muted background for contrast

**File (new):** `apps/web/src/app/(auth)/layout.tsx`

Create an auth-specific layout that wraps all auth route group pages with:
- `bg-muted` — the slightly darker mist gray, creating contrast against the white card
- `min-h-screen` — full viewport height
- Flexbox centering for content

This layout will be inherited by all future auth pages (forgot-password, register, etc.).

### 3. Login page simplification

**File:** `apps/web/src/app/(auth)/login/page.tsx`

Remove the `<main>` wrapper and centering classes since the auth layout handles that. Render the heading and `<LoginForm />` in a simple container with vertical gap.

### 4. Login form card fixes

**File:** `apps/web/src/features/auth/components/login-form.tsx`

- Add `shadow-md` to the Card className (local override, not global) for more pronounced depth matching the reference design
- Change button from `variant="outline"` to `variant="default"` to render as the green primary button

### Files Changed

| File | Action |
|------|--------|
| `apps/web/src/app/layout.tsx` | Edit — add `bg-background text-foreground` to body |
| `apps/web/src/app/(auth)/layout.tsx` | Create — auth layout with `bg-muted` centering |
| `apps/web/src/app/(auth)/login/page.tsx` | Edit — simplify, remove main wrapper |
| `apps/web/src/features/auth/components/login-form.tsx` | Edit — `shadow-md` on Card, `variant="default"` on Button |

### Files NOT Changed

- `packages/ui/src/components/ui/card.tsx` — Card component stays unchanged; shadow override is local
- `packages/ui/src/globals.css` — Theme variables are already correct
- `apps/web/src/app/globals.css` — No changes needed
