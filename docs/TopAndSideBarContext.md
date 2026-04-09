

# Sidebar & Top Bar Implementation Prompt — `apps/web` and `apps/desktop`

> **Target:**  sidebar navigation, top bar, and placeholder pages for both the web and desktop applications in the
> RamcarPlatform Turborepo monorepo.

---

Both apps already have:
- shadcn/ui configured with Tailwind CSS
- `next-intl` (web) and an equivalent i18n setup (desktop) with `es-MX` (default) and `en-US` locales
- A language switcher button already implemented in both apps
- Dark/light theme support via Tailwind's `dark` class (or `next-themes` in web)

The application serves four roles: **SuperAdmin**, **Admin**, **Guard**, and **Resident**. Each role
sees a different set of modules in the sidebar. The sidebar must be role-aware but that filtering logic
is a future task — for now, implement the full Admin sidebar as the default view for `apps/web` and
the full Guard sidebar as the default view for `apps/desktop`.

---

## Deliverables

### 1. Shared Sidebar Configuration (`packages/shared`)

Create a centralized module registry that both apps consume. This file is the **single source of truth**
for which modules exist, their translation keys, icons, routes, and submodules.

**File:** `packages/shared/src/navigation/sidebar-config.ts`

```ts
// This is the target API — implement it exactly

export type SidebarItem = {
  key: string;                    // Unique identifier and i18n key prefix
  icon: string;                   // Lucide icon name (e.g., "LayoutDashboard")
  route: string;                  // Base route path
  subItems?: SidebarSubItem[];    // Optional collapsible children
  roles: Role[];                  // Which roles can see this item
  platforms: Platform[];          // Which apps render this item
};

export type SidebarSubItem = {
  key: string;                    // Sub-key (appended to parent key for i18n)
  route: string;                  // Full route path
};

export type Role = "super_admin" | "admin" | "guard" | "resident";
export type Platform = "web" | "desktop" | "mobile";
```

**Admin modules (web):**

| Key | Icon | Route | Submodules | Roles |
|---|---|---|---|---|
| `dashboard` | `LayoutDashboard` | `/dashboard` | — | all |
| `catalogs` | `BookOpen` | `/catalogs` | — | super_admin, admin |
| `logbook` | `ClipboardList` | `/logbook` | `visitors`, `providers`, `residents` | super_admin, admin |
| `visits-and-residents` | `Users` | `/visits-and-residents` | — | super_admin, admin |
| `projects` | `FolderKanban` | `/projects` | — | super_admin, admin |
| `wifi` | `Wifi` | `/wifi` | — | super_admin, admin |
| `complaints` | `MessageSquare` | `/complaints` | — | super_admin, admin, resident |
| `patrols` | `Route` | `/patrols` | — | super_admin, admin |
| `amenities` | `CalendarDays` | `/amenities` | — | super_admin, admin, resident |
| `announcements` | `Megaphone` | `/announcements` | — | super_admin, admin |
| `lost-and-found` | `Search` | `/lost-and-found` | — | super_admin, admin |
| `history` | `History` | `/history` | — | super_admin, admin |
| `blacklist` | `ShieldAlert` | `/blacklist` | — | super_admin, admin |

**Guard modules (desktop):**

| Key | Icon | Route | Submodules | Roles |
|---|---|---|---|---|
| `dashboard` | `LayoutDashboard` | `/dashboard` | — | guard |
| `access-log` | `DoorOpen` | `/access-log` | `visitors`, `providers`, `residents` | guard |
| `patrols` | `Route` | `/patrols` | — | guard |

**Resident modules (web + mobile):**

| Key | Icon | Route | Submodules | Roles |
|---|---|---|---|---|
| `dashboard` | `LayoutDashboard` | `/dashboard` | — | resident |
| `my-visits` | `Eye` | `/my-visits` | — | resident |
| `logbook` | `ClipboardList` | `/logbook` | — | resident |
| `amenities` | `CalendarDays` | `/amenities` | — | resident |
| `complaints` | `MessageSquare` | `/complaints` | — | resident |

---

### 2. Shared Translation Keys (`packages/shared`)

Create the translation map that both apps consume for sidebar labels. This is NOT the full i18n file —
it is the sidebar-specific key structure that gets merged into each app's translation files.

**File:** `packages/shared/src/navigation/sidebar-i18n.ts`

```ts
// Export the key-value map for sidebar translations
// Both apps import this and merge it into their respective i18n systems

export const sidebarTranslations = {
  "en-US": {
    sidebar: {
      dashboard: "Dashboard",
      catalogs: "Catalogs",
      logbook: "Logbook",
      "logbook.visitors": "Visitors",
      "logbook.providers": "Providers",
      "logbook.residents": "Residents",
      "visits-and-residents": "Visits & Residents",
      projects: "Projects",
      wifi: "Wi-Fi Networks",
      complaints: "Complaints & Suggestions",
      patrols: "Patrols",
      amenities: "Amenities",
      announcements: "Announcements",
      "lost-and-found": "Lost & Found",
      history: "History",
      blacklist: "Blacklist",
      "access-log": "Access Log",
      "access-log.visitors": "Visitors",
      "access-log.providers": "Providers",
      "access-log.residents": "Residents",
      "my-visits": "My Visits",
      account: "Account",
      logout: "Log out",
    },
  },
  "es-MX": {
    sidebar: {
      dashboard: "Panel",
      catalogs: "Catálogos",
      logbook: "Bitácora",
      "logbook.visitors": "Visitantes",
      "logbook.providers": "Proveedores",
      "logbook.residents": "Residentes",
      "visits-and-residents": "Visitas y Residentes",
      projects: "Proyectos",
      wifi: "Redes Wi-Fi",
      complaints: "Quejas y Sugerencias",
      patrols: "Rondines",
      amenities: "Amenidades",
      announcements: "Avisos",
      "lost-and-found": "Extraviados",
      history: "Historial",
      blacklist: "Lista Negra",
      "access-log": "Movimientos",
      "access-log.visitors": "Visitantes",
      "access-log.providers": "Proveedores",
      "access-log.residents": "Residentes",
      "my-visits": "Mis Visitas",
      account: "Cuenta",
      logout: "Cerrar sesión",
    },
  },
} as const;
```

Each app must merge these keys into its own i18n message files (e.g., `apps/web/messages/es-MX.json`
and `apps/desktop/src/locales/es-MX.json`).

---

### 3. Sidebar UI Component

**Goal:** A collapsible sidebar that follows shadcn/ui's design language, with smooth open/close
animation, collapsible submodule groups, a user section at the bottom, and role-aware module filtering.

#### Placement Decision

**Try `packages/ui` first.** The sidebar component should live in `packages/ui/src/components/sidebar/`
if it can be implemented as a pure presentational component that receives its data (items, user info,
callbacks) via props. Both apps would import it and wire their own routing and i18n.

If the routing integration (Next.js `<Link>` vs React Router `<Link>` vs Electron navigation) makes
a shared component impractical, then **fall back to implementing the sidebar in each app** and only
share the config + translations from `packages/shared`. Document the decision in a comment at the top
of each sidebar file.

#### Component API (target for `packages/ui`)

```tsx
type AppSidebarProps = {
  items: SidebarItem[];              // Filtered by role already
  currentPath: string;               // Current route for active state
  collapsed: boolean;                 // Sidebar open/closed state
  onToggleCollapse: () => void;       // Toggle callback
  onNavigate: (route: string) => void; // Routing abstraction
  t: (key: string) => string;        // i18n translation function
  user: {
    name: string;
    email: string;
    avatarUrl?: string;               // Falls back to initials placeholder
  };
  onAccountClick: () => void;
  onLogoutClick: () => void;
};
```

#### Visual Behavior

- **Collapsed state:** Shows only icons (no text). Hovering an icon shows a tooltip with the module name.
- **Expanded state:** Shows icon + translated label. Sidebar width ~256px.
- **Toggle button:** A chevron icon at the top of the sidebar (or bottom) that toggles between collapsed
  and expanded. Persist the preference in localStorage (web) or electron-store (desktop).
- **Animation:** Use CSS transitions (`transition-all duration-300 ease-in-out`) for the width change.
  Content should fade in/out during the transition.
- **Collapsible submodules:** Modules with `subItems` (Logbook, Access Log) render as accordion-style
  groups. Clicking the parent toggles the subitem list open/closed with a rotate animation on the
  chevron icon. Subitems are indented.
- **Active state:** The current route highlights the active sidebar item with a distinct background
  (use shadcn's `accent` color token). If a subitem is active, its parent is also visually expanded.
- **Theming:** The sidebar must respect the current theme (light/dark) using shadcn/ui's CSS variables.
  Use `bg-sidebar` / `text-sidebar-foreground` tokens if available, otherwise use `bg-card` / `text-card-foreground`.

#### User Section (bottom of sidebar)

- Fixed at the bottom of the sidebar.
- Shows: user avatar (circular, 32px — image or initials placeholder), user name, and a truncated email.
- In collapsed state, shows only the avatar.
- Clicking the user section opens a **floating popover menu** (use shadcn `Popover` or `DropdownMenu`) with two options:
  - **Account** — navigates to `/account` (a placeholder page showing "Account — coming soon")
  - **Log out** — calls the `onLogoutClick` callback (stub: `console.log("logout")`)

---

### 4. Top Bar Component

A horizontal bar at the top of the content area (to the right of the sidebar), sticky.

#### Content

- **Left side:** Empty for now (will hold breadcrumbs in the future).
- **Right side:** Two icon buttons:
  1. **Theme toggle** — Switches between light and dark mode. Use `Sun` / `Moon` icons from lucide-react.
     Implement using `next-themes` (web) or a Zustand slice (desktop). This is a new button.
  2. **Language toggle** — Already implemented in both apps. Just place the existing component here.
     If it currently lives elsewhere in the layout, move it to this top bar position.

#### Visual Behavior

- Height: 48–56px.
- Background: `bg-background` with a subtle bottom border (`border-b`).
- Sticky: stays at the top when content scrolls.
- Responsive: on mobile/small screens, add a hamburger button on the left that toggles the sidebar
  as an overlay.

---

### 5. Placeholder Pages

For every sidebar module and submodule route, create a minimal placeholder page:

**Example For `apps/web` (Next.js App Router):**

```
app/[locale]/(dashboard)/
├── dashboard/page.tsx
├── catalogs/page.tsx
├── logbook/
│   ├── page.tsx              → redirects to /logbook/visitors
│   ├── visitors/page.tsx
│   ├── providers/page.tsx
│   └── residents/page.tsx
├── visits-and-residents/page.tsx
├── projects/page.tsx
├── wifi/page.tsx
├── complaints/page.tsx
├── patrols/page.tsx
├── amenities/page.tsx
├── announcements/page.tsx
├── lost-and-found/page.tsx
├── history/page.tsx
├── blacklist/page.tsx
└── account/page.tsx
```

**Example For `apps/desktop` (React Router or Electron routing):**

```
src/renderer/pages/
├── Dashboard.tsx
├── AccessLog.tsx              → redirects to /access-log/visitors
├── AccessLogVisitors.tsx
├── AccessLogProviders.tsx
├── AccessLogResidents.tsx
├── Patrols.tsx
└── Account.tsx
```


The translated module name is centered on the page. Nothing else. This is purely for testing navigation.

---

### 6. Key Constraints

1. **All sidebar labels come from i18n** — no hardcoded strings. Use the translation keys from
   `packages/shared/src/navigation/sidebar-i18n.ts`.
2. **Module config is shared** — `sidebar-config.ts` is the single source of truth. To add or remove
   a module from the sidebar, you edit ONE file in `packages/shared` and both apps reflect the change.
3. **Routing is app-specific** — the `onNavigate` callback abstracts the routing. In `apps/web` it
   calls `router.push()` from `next/navigation`. In `apps/desktop` it calls the React Router or
   Electron equivalent.
4. **Icons use lucide-react** — already available in both apps via `packages/ui`.
5. **Persistence:** Sidebar collapsed state persists across sessions. Use `localStorage` in web,
   `electron-store` in desktop.
6. **No authentication logic** — hardcode the role as `"admin"` in web and `"guard"` in desktop for
   this implementation. Role-based filtering of sidebar items will be wired to real auth in a future task.
7. **Accessibility:** All interactive elements must have keyboard support. Sidebar items are navigable
   with Tab and activatable with Enter/Space. The collapsible groups use proper `aria-expanded` attributes.


# Application Modules by Role

## Admin / SuperAdmin

| Module | Key | Submodules | Route |
|---|---|---|---|
| Dashboard | `dashboard` | — | `/dashboard` |
| Catalogs | `catalogs` | — | `/catalogs` |
| Logbook (Bitácora) | `logbook` | Visitors, Providers, Residents | `/logbook/visitors`, `/logbook/providers`, `/logbook/residents` |
| Visits & Residents | `visits-and-residents` | — | `/visits-and-residents` |
| Projects | `projects` | — | `/projects` |
| Wi-Fi Networks | `wifi` | — | `/wifi` |
| Complaints & Suggestions | `complaints` | — | `/complaints` |
| Patrols | `patrols` | — | `/patrols` |
| Amenities | `amenities` | — | `/amenities` |
| Announcements | `announcements` | — | `/announcements` |
| Lost & Found | `lost-and-found` | — | `/lost-and-found` |
| History | `history` | — | `/history` |
| Blacklist | `blacklist` | — | `/blacklist` |

## Guard

| Module | Key | Submodules | Route |
|---|---|---|---|
| Dashboard | `dashboard` | — | `/dashboard` |
| Access Log (Movimientos) | `access-log` | Visitors, Providers, Residents | `/access-log/visitors`, `/access-log/providers`, `/access-log/residents` |
| Patrols | `patrols` | — | `/patrols` |

> **Note:** Patrols is only available on `apps/desktop` and `apps/mobile` — not on `apps/web`.

## Resident

| Module | Key | Submodules | Route |
|---|---|---|---|
| Dashboard | `dashboard` | — | `/dashboard` |
| My Visits | `my-visits` | — | `/my-visits` |
| Logbook (Pre-registration) | `logbook` | — | `/logbook` |
| Amenities | `amenities` | — | `/amenities` |
| Complaints & Suggestions | `complaints` | — | `/complaints` |
