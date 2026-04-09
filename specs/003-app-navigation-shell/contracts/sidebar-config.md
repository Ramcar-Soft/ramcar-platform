# Contract: Sidebar Configuration

**Package**: `@ramcar/shared`  
**Path**: `packages/shared/src/navigation/sidebar-config.ts`  
**Consumers**: `apps/web`, `apps/desktop`

## Type Definitions

```ts
import type { Role } from "../types/auth";

export type Platform = "web" | "desktop" | "mobile";

export type SidebarSubItem = {
  key: string;
  route: string;
};

export type SidebarItem = {
  key: string;
  icon: string;         // Lucide icon name (string, not component)
  route: string;
  subItems?: SidebarSubItem[];
  roles: Role[];
  platforms: Platform[];
};
```

## Exported Data

```ts
export const sidebarItems: SidebarItem[];
```

### Complete Item Registry

| key | icon | route | subItems | roles | platforms |
|-----|------|-------|----------|-------|-----------|
| `dashboard` | `LayoutDashboard` | `/dashboard` | — | all | web, desktop, mobile |
| `catalogs` | `BookOpen` | `/catalogs` | — | super_admin, admin | web |
| `logbook` | `ClipboardList` | `/logbook` | visitors, providers, residents | super_admin, admin | web |
| `visits-and-residents` | `Users` | `/visits-and-residents` | — | super_admin, admin | web |
| `projects` | `FolderKanban` | `/projects` | — | super_admin, admin | web |
| `wifi` | `Wifi` | `/wifi` | — | super_admin, admin | web |
| `complaints` | `MessageSquare` | `/complaints` | — | super_admin, admin, resident | web, mobile |
| `patrols` | `Route` | `/patrols` | — | super_admin, admin, guard | desktop, mobile |
| `amenities` | `CalendarDays` | `/amenities` | — | super_admin, admin, resident | web, mobile |
| `announcements` | `Megaphone` | `/announcements` | — | super_admin, admin | web |
| `lost-and-found` | `Search` | `/lost-and-found` | — | super_admin, admin | web |
| `history` | `History` | `/history` | — | super_admin, admin | web |
| `blacklist` | `ShieldAlert` | `/blacklist` | — | super_admin, admin | web |
| `access-log` | `DoorOpen` | `/access-log` | visitors, providers, residents | guard | desktop |
| `my-visits` | `Eye` | `/my-visits` | — | resident | web, mobile |

## Helper Functions

```ts
/** Filter sidebar items by platform */
export function getItemsForPlatform(platform: Platform): SidebarItem[];

/** Filter sidebar items by role (future use) */
export function getItemsForRole(role: Role, platform: Platform): SidebarItem[];
```

## i18n Key Convention

Translation keys follow the pattern:
- Top-level module: `sidebar.{key}` → e.g., `sidebar.dashboard`
- Submodule: `sidebar.{parentKey}.{subKey}` → e.g., `sidebar.logbook.visitors`
- Utility items: `sidebar.account`, `sidebar.logout`

These keys are added to `packages/i18n/src/messages/{en,es}.json` under the `sidebar` namespace.

## Usage by Consumers

```ts
// apps/web — filter for web platform
import { getItemsForPlatform } from "@ramcar/shared";
const webItems = getItemsForPlatform("web");

// apps/desktop — filter for desktop platform
const desktopItems = getItemsForPlatform("desktop");
```
