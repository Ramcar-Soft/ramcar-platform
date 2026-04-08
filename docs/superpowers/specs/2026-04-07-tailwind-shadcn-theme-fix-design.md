# Tailwind & shadcn Theme Fix — Design Spec

**Date:** 2026-04-07
**Branch:** 001-auth-login
**Scope:** Fix Tailwind v4 / shadcn theming across the monorepo

---

## Problem

The Ramcar monorepo has a broken Tailwind v4 theming setup:

1. **Dual Tailwind instances.** Both `apps/web/src/app/globals.css` and `packages/ui/src/globals.css` contain `@import "tailwindcss"`. When both CSS files are JS-imported in `layout.tsx`, two independent PostCSS processing contexts are created. The `@theme inline` block (which maps CSS variable names like `--primary` to Tailwind utility classes like `bg-primary`) only exists in packages/ui's context — apps/web's Tailwind instance doesn't see it.

2. **Missing `@layer base` defaults.** The reference shadcn/ui setup includes `@layer base { * { @apply border-border outline-ring/50; } body { @apply bg-background text-foreground; } }`. Ramcar has neither, causing inconsistent border/body styling.

3. **Missing `shadcn` package.** The modern shadcn/ui Tailwind v4 setup uses `@import "shadcn/tailwind.css"` which provides Radix data-attribute custom variants, accordion animations, and a no-scrollbar utility. Ramcar doesn't have this package.

4. **No single source of truth for theme.** Theme colors are defined in `packages/ui/src/globals.css` but consumed via a JS import that creates a separate processing context. Apps cannot cleanly consume the theme without duplication.

**Symptoms:** Colors applying incorrectly (B), some components styled while others are not (C).

---

## Solution

Restructure the CSS pipeline so that each consuming app has **one Tailwind instance** that receives the theme via CSS `@import` from `@ramcar/ui/theme.css` — a clean package import with no relative paths for theming.

### Architecture

```
apps/web/src/app/globals.css
  ├── @import "tailwindcss"              ← Tailwind base (single instance)
  ├── @import "shadcn/tailwind.css"      ← Radix variants, animations
  ├── @import "@ramcar/ui/theme.css"     ← Theme colors, radii, fonts, dark mode, base layer
  └── @source "../../../../packages/ui/src"  ← Content scanning for class usage
```

### New file: `packages/ui/src/theme.css`

Single source of truth for the Ramcar theme. Contains everything apps need — extracted from the current `globals.css` minus `@import "tailwindcss"`:

- `@custom-variant dark` — dark mode variant definition
- `@theme inline` — maps CSS variables to Tailwind tokens (`--color-background: var(--background)`, etc.)
- `:root` — light mode CSS variable values (oklch colors, radius, etc.)
- `.dark` — dark mode CSS variable overrides
- `@layer base` — global defaults (`border-border`, `outline-ring/50`, body `bg-background text-foreground`)

### Updated export: `packages/ui/package.json`

```json
"exports": {
  ".": "./src/index.ts",
  "./globals.css": "./src/globals.css",
  "./theme.css": "./src/theme.css"
}
```

### Updated: `apps/web/src/app/globals.css`

```css
@import "tailwindcss";
@import "shadcn/tailwind.css";
@import "@ramcar/ui/theme.css";

@source "../../../../packages/ui/src";
```

Replaces the current content:
```css
@import "tailwindcss";
@source "../../../../packages/ui/src";
```

### Updated: `apps/web/src/app/layout.tsx`

Remove the JS import of `@ramcar/ui/globals.css`:
```tsx
import "./globals.css";
// REMOVED: import "@ramcar/ui/globals.css";
```

Remove `bg-background text-foreground` from the body className (now handled by `@layer base` in theme.css):
```tsx
<body className={`${geistSans.variable} ${inter.variable} font-body antialiased`}>
```

### Updated: `apps/desktop/src/index.css`

```css
@import "tailwindcss";
@import "shadcn/tailwind.css";
@import "@ramcar/ui/theme.css";

@source "../../../../packages/ui/src";

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}
```

### Updated: `apps/desktop/src/main.tsx`

Remove the JS import of `@ramcar/ui/globals.css`:
```tsx
// REMOVED: import '@ramcar/ui/globals.css'
import './index.css'
```

### New dependency

Install `shadcn` as a devDependency in each consuming app (PostCSS runs in the app, so it must resolve the import):
```bash
pnpm --filter @ramcar/web --filter @ramcar/desktop add -D shadcn
```

Also add it to `packages/ui` so that the standalone `globals.css` entrypoint can reference it if needed:
```bash
pnpm --filter @ramcar/ui add -D shadcn
```

### Unchanged files

| File | Reason |
|------|--------|
| `packages/ui/src/globals.css` | Kept as standalone entrypoint for consumers outside the monorepo. Apps stop JS-importing it. |
| `packages/ui/components.json` | No changes needed. `css` still points to `src/globals.css` for the shadcn CLI. |
| `apps/web/tailwind.config.ts` | Content paths already include `../../packages/ui/src/**/*.{ts,tsx}`. |
| `apps/web/postcss.config.mjs` | Already uses `@tailwindcss/postcss`. |
| `packages/ui/src/lib/utils.ts` | `cn()` utility unchanged. |
| Component files in `packages/ui/src/components/` | No changes — they already use semantic classes like `bg-primary`. |

---

## Why This Works

1. **One Tailwind instance per app.** Only `apps/web/globals.css` has `@import "tailwindcss"`. The `@theme inline` block from `@ramcar/ui/theme.css` is pulled into the same PostCSS context via CSS `@import`, so Tailwind sees all color mappings.

2. **Single source of truth.** `packages/ui/src/theme.css` defines colors once. All consuming apps (web, desktop) import the same file via package name.

3. **No relative paths for theming.** `@import "@ramcar/ui/theme.css"` resolves via pnpm workspace symlinks and package.json exports. The only remaining relative path is `@source` for content scanning, which is a Tailwind v4 requirement for monorepos.

4. **Canonical shadcn/ui setup.** Matches the official Tailwind v4 docs: `@import "tailwindcss"` → `@import "shadcn/tailwind.css"` → theme.

---

## Scope

**In scope:**
- Create `packages/ui/src/theme.css`
- Update `packages/ui/package.json` exports
- Update `apps/web/src/app/globals.css`
- Update `apps/web/src/app/layout.tsx`
- Update `apps/desktop/src/index.css`
- Update `apps/desktop/src/main.tsx`
- Install `shadcn` devDependency in `packages/ui`
- Verify login page renders correctly with proper theme colors

**Out of scope:**
- `apps/www` — intentionally standalone, does not use `@ramcar/ui`
- Dark mode toggle implementation
- New components or theme customization
- Removing `tailwind.config.ts` files (they still serve content path scanning)
