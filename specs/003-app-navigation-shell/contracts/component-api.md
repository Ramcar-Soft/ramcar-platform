# Contract: Component APIs

**Feature**: 003-app-navigation-shell  
**Date**: 2026-04-08

## 1. AppSidebar (per-app wrapper)

Each app implements its own `AppSidebar` component in `src/features/navigation/`. This component wraps the shadcn/ui `Sidebar` primitives from `@ramcar/ui` and provides app-specific routing and i18n.

### Props (conceptual — each app implements differently)

```ts
type AppSidebarProps = {
  items: SidebarItem[];              // Pre-filtered by platform
  user: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
  onLogout: () => void;
};
```

### Behavior Contract

- Renders all `items` as sidebar menu entries with icons and translated labels
- Items with `subItems` render as collapsible groups (accordion-style)
- Highlights the currently active item based on current route/path
- Displays user profile section at the bottom (avatar/initials, name, email)
- User section click opens a dropdown with "Account" and "Log Out" options
- Supports collapsed (icon-only) and expanded states via sidebar provider
- Collapsed state persists to local storage

### Web-Specific Implementation

- Uses `usePathname()` from `next/navigation` for active state
- Uses `useRouter().push()` for navigation via Next.js `Link` components
- Uses `useTranslations("sidebar")` from `next-intl` for labels
- Integrates with shadcn `SidebarProvider` for collapse state

### Desktop-Specific Implementation

- Uses `currentPath` from Zustand `SidebarSlice` for active state
- Uses `navigate()` from Zustand `SidebarSlice` for navigation
- Uses `useTranslation()` from `react-i18next` with `t("sidebar.key")` for labels
- Integrates with shadcn `SidebarProvider` for collapse state

## 2. TopBar

### Props

```ts
type TopBarProps = {
  children?: React.ReactNode;        // Future: breadcrumbs, search
};
```

### Behavior Contract

- Renders a horizontal bar at the top of the content area
- Sticky/fixed position — stays visible during scroll
- Right side: theme toggle button + language switcher component
- Left side: empty (reserved for future breadcrumbs)
- Web: includes a hamburger/menu button on the left for mobile breakpoints (triggers sidebar sheet)
- Desktop: no hamburger button (desktop app is fixed-size)

## 3. ThemeToggle

### Props

```ts
type ThemeToggleProps = {
  className?: string;
};
```

### Behavior Contract

- Renders a button with Sun icon (light mode) or Moon icon (dark mode)
- Click toggles between light and dark modes
- Web: uses `useTheme()` from `next-themes`
- Desktop: uses `setTheme()` from Zustand `ThemeSlice`

## 4. Placeholder Page

### Props (conceptual)

```ts
// Web: Server component, receives params from route
// Desktop: Regular React component

type PlaceholderPageProps = {
  titleKey: string;  // i18n key for the page title (e.g., "sidebar.dashboard")
};
```

### Behavior Contract

- Displays the translated module name centered on the page
- Uses the current locale's translation
- No other content or functionality
- Consistent styling across all placeholder pages
