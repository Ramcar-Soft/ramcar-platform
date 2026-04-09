# Research: Fix Desktop Sidebar Dropdown Menu

## Decision 1: Root Cause — React Version Mismatch

**Decision**: The primary cause is that the desktop app runs React 18.3.1 while the shared `@ramcar/ui` components (shadcn/ui for Tailwind v4) target React 19.

**Rationale**:

The `SidebarMenuButton` component (`packages/ui/src/components/ui/sidebar.tsx:498-546`) is a plain function component with no `forwardRef`. In the sidebar footer, it's used as:

```tsx
<DropdownMenuTrigger asChild>
  <SidebarMenuButton size="lg" ...>
```

Radix's `DropdownMenuTrigger` with `asChild` uses Radix `Slot`, which merges props (including a ref) onto the child via `React.cloneElement()`. The Slot implementation (`@radix-ui/react-slot@1.2.4`) uses `composeRefs()` to combine the forwarded ref with the child's existing ref.

- **React 19**: Function components receive `ref` as a regular prop. `React.cloneElement()` can merge refs onto function components. The ref reaches the underlying `<button>` element. Radix Popper can measure the trigger.
- **React 18**: Function components do NOT receive `ref` as a regular prop (requires `forwardRef`). `React.cloneElement()` silently drops the ref. Radix Popper cannot measure the trigger.

Without the trigger measurement, Radix sets `--radix-dropdown-menu-content-available-height` incorrectly (near 0). The `DropdownMenuContent` has `max-h-(--radix-dropdown-menu-content-available-height)` (`dropdown-menu.tsx:43`), constraining the visible area to near-zero. Content overflows → scroll bar appears, but the visible area is too small to show the menu items.

The web app uses React 19.2.3, where this works correctly. The desktop app used React 18.3.1.

**Alternatives considered**:
- CSS/theme issue (dark mode variables not inheriting to portaled content): Ruled out. CSS custom properties on `.dark` (applied to `<html>`) correctly cascade to `<body>` children, including portal content. The `@custom-variant dark (&:is(.dark *))` only affects `dark:` prefixed Tailwind utilities, not CSS variable inheritance.
- Tailwind class generation issue: Ruled out. The desktop `index.css` has `@source "../../../packages/ui/src"` which scans the UI package. All dropdown-related classes are generated.
- Electron-specific rendering issue: Ruled out. Electron uses Chromium, which handles CSS and portals identically to Chrome.

## Decision 2: Fix Strategy — Upgrade React to 19

**Decision**: Upgrade `react` and `react-dom` in `apps/desktop/package.json` from `^18.2.0` to `^19.2.3`.

**Rationale**:
- Aligns desktop with web (both React 19)
- The `@types/react: ^19` was already declared in desktop devDependencies, indicating intent to use React 19
- All desktop dependencies support React 19: `react-i18next ^17`, `@vitejs/plugin-react ^4.2.1`, `lucide-react ^1.7.0`, `radix-ui ^1.4.3`, Electron 30
- The `@ramcar/ui` package's shadcn components are designed for React 19 (no `forwardRef` usage anywhere in `sidebar.tsx`)

**Alternatives considered**:
- Add `forwardRef` to `SidebarMenuButton` in shared UI: Would fix the specific issue but modifies a shadcn-generated component, making future shadcn updates harder. Also, there may be other components with the same pattern.
- Replace `SidebarMenuButton` with a plain `<button>` in the desktop sidebar footer: Workaround that avoids the ref issue but duplicates styling logic and diverges from the web implementation.
- Pin Radix to an older version compatible with React 18: Backwards step that prevents access to bug fixes and improvements.

## Decision 3: No Data Model or Interface Changes Required

**Decision**: This is a dependency version bump only. No data model changes, no new interfaces, no API contracts.

**Rationale**: The bug is caused by a React version incompatibility. The fix is a package.json change + lockfile update. No application code changes required.
