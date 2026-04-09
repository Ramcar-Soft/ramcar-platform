# Research: App Navigation Shell

**Feature**: 003-app-navigation-shell  
**Date**: 2026-04-08

## R-001: Sidebar Component Strategy

**Decision**: Use the official shadcn/ui `sidebar` component as the foundation.

**Rationale**: shadcn/ui ships an official sidebar component (`npx shadcn@latest add sidebar`) that includes `sidebar.tsx`, plus dependencies: `separator.tsx`, `sheet.tsx`, `tooltip.tsx`, `skeleton.tsx`, and a `use-mobile.ts` hook. This component is:
- Already designed for the shadcn design system (Radix + Tailwind CSS variables)
- Includes built-in collapsible behavior, icon-only mode, mobile sheet overlay
- Follows the project's existing pattern of installing shadcn components into `packages/ui`

**Alternatives considered**:
- **Custom sidebar from scratch**: Higher effort, no benefit over the official component
- **Third-party sidebar library (react-pro-sidebar, etc.)**: Doesn't integrate with shadcn theming; adds an external dependency outside the design system

## R-002: Sidebar Placement — Shared vs Per-App

**Decision**: The sidebar UI component lives in `packages/ui` as a presentational component. Each app wraps it with app-specific routing and i18n integration.

**Rationale**: The shadcn sidebar component is framework-agnostic (pure React + Tailwind). Routing is abstracted via an `onNavigate` callback prop, and i18n is abstracted via a translation function prop `t()`. This keeps `packages/ui` free of Next.js or Electron dependencies. Each app creates a thin wrapper feature (`src/features/navigation/`) that:
- Filters sidebar items by platform from the shared config
- Provides the routing callback (Next.js `router.push` vs desktop page state)
- Provides the i18n translation function (`useTranslations` vs `useTranslation`)

**Alternatives considered**:
- **Duplicate sidebar in each app**: Violates DRY, risks drift between web and desktop
- **Full sidebar with routing in packages/ui**: Would require importing Next.js and React Router into the shared package, breaking the dependency boundary

## R-003: Desktop Routing Strategy

**Decision**: Use a simple Zustand-based page state manager (no external router library).

**Rationale**: The desktop app currently has no routing library — it uses conditional rendering based on auth state in `App.tsx`. The guard booth app has only 3 main modules (Dashboard, Access Log with 3 subpages, Patrols) plus Account. This is too few pages to justify adding a full routing library. A Zustand slice (`NavigationSlice`) that tracks `currentPath: string` and a `navigate(path: string)` function is sufficient. The sidebar's `onNavigate` callback calls `navigate()`, and `App.tsx` renders the appropriate page component based on `currentPath`.

**Alternatives considered**:
- **React Router**: Overkill for 6 pages in an Electron app; adds complexity with hash routing configuration
- **TanStack Router**: Type-safe but heavyweight for this use case; worth revisiting if desktop grows significantly
- **Wouter**: Lightweight but still adds an external dependency for a simple problem

## R-004: Theme Toggle — Web App

**Decision**: Install `next-themes` for the web app's theme toggle.

**Rationale**: The web app already uses Tailwind's `dark:` class strategy and shadcn CSS variables, but has no `ThemeProvider` or toggle mechanism. `next-themes` is the standard solution for Next.js apps:
- Handles SSR hydration correctly (avoids flash of wrong theme)
- Integrates with Tailwind's `darkMode: "class"` strategy
- Used by shadcn/ui's own documentation and recommended setup
- Provides `useTheme()` hook for the toggle button

**Alternatives considered**:
- **Manual class toggle via localStorage + useEffect**: Works but doesn't handle SSR flash; requires reinventing what next-themes already solves
- **Zustand theme slice for web**: Zustand runs client-side only; would cause a flash of unstyled content on SSR pages

## R-005: Theme Toggle — Desktop App

**Decision**: Add a `ThemeSlice` to `@ramcar/store` (Zustand) for the desktop app's theme management.

**Rationale**: The desktop app is fully client-rendered (Vite + React in Electron), so SSR hydration is not a concern. A Zustand slice is the simplest approach:
- Aligns with the existing state management pattern (`AuthSlice`)
- Persists preference to `localStorage` (or `electron-store` via IPC, consistent with language preference)
- Toggles the `dark` class on `document.documentElement`
- No external dependency needed

The web app should NOT use this slice for theme management (it uses `next-themes` instead), so the slice is consumed only by the desktop app.

**Alternatives considered**:
- **next-themes in desktop**: Not applicable — desktop doesn't use Next.js
- **CSS media query only (prefers-color-scheme)**: Doesn't allow manual toggle; users can't override

## R-006: Navigation Configuration Architecture

**Decision**: Centralized navigation config in `packages/shared/src/navigation/` with sidebar items and translation keys.

**Rationale**: The context document specifies a single source of truth for sidebar modules. Two files:
1. `sidebar-config.ts` — Array of `SidebarItem` objects with key, icon name (string), route, subItems, roles, and platforms. Both apps import and filter by platform.
2. Translation keys merged into the existing `packages/i18n` message files (JSON) under a `sidebar` namespace. This integrates with the existing i18n infrastructure (`next-intl` for web, `react-i18next` for desktop) rather than creating a parallel translation system.

**Alternatives considered**:
- **Separate sidebar-i18n.ts with inline translations**: Creates a parallel i18n system disconnected from the existing JSON message files; both apps would need merge logic at runtime
- **Config per app**: Violates single source of truth; adding a module requires editing two files

## R-007: shadcn Components Needed

**Decision**: Install the following shadcn components into `packages/ui`:

| Component | Purpose |
|-----------|---------|
| `sidebar` | Main sidebar component (auto-installs separator, sheet, tooltip, skeleton) |
| `dropdown-menu` | User profile menu (Account, Log Out) |
| `collapsible` | Expandable submodule groups |
| `avatar` | User profile display in sidebar footer |

**Rationale**: These are all official shadcn components built on Radix primitives. The `sidebar` installation brings in most of what's needed. `dropdown-menu`, `collapsible`, and `avatar` are additional primitives required by the user section and submodule behavior.

## R-008: Existing Component Migration

**Decision**: Move the language switcher from its current position (absolute-positioned in protected layout) into the top bar component.

**Rationale**: Both apps already have a working `LanguageSwitcher` component:
- Web: `apps/web/src/shared/components/language-switcher.tsx` — currently positioned `absolute top-4 right-4` in the protected layout
- Desktop: `apps/desktop/src/shared/components/language-switcher.tsx`

The top bar becomes the new home for this component. The protected layout (web) and App.tsx (desktop) will be refactored to use the new sidebar + top bar layout shell instead of the current minimal layout.

## R-009: Protected Route Group Restructuring (Web)

**Decision**: Rename the web app's `(protected)` route group to `(dashboard)` and add all module pages under it.

**Rationale**: The current `(protected)` group contains only a single dashboard page. The navigation shell requires all authenticated module pages to share the same sidebar + top bar layout. Using `(dashboard)` as the route group name better describes its purpose (the main app shell with navigation). The layout.tsx in this group will contain the sidebar provider, sidebar component, top bar, and content area. All placeholder pages live under this group.

**Alternatives considered**:
- **Keep `(protected)` name**: Less descriptive; "protected" describes access control, not layout
- **Nested `(protected)/(dashboard)`**: Unnecessary nesting for no benefit
