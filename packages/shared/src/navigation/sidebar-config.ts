import type { Role } from "../types/auth";

export type Platform = "web" | "desktop" | "mobile";

export type SidebarSubItem = {
  key: string;
  route: string;
};

export type SidebarItem = {
  key: string;
  icon: string;
  route: string;
  subItems?: SidebarSubItem[];
  roles: Role[];
  platforms: Platform[];
};

export const sidebarItems: SidebarItem[] = [
  {
    key: "dashboard",
    icon: "LayoutDashboard",
    route: "/dashboard",
    roles: ["super_admin", "admin", "guard", "resident"],
    platforms: ["web", "desktop", "mobile"],
  },
  {
    key: "catalogs",
    icon: "BookOpen",
    route: "/catalogs",
    subItems: [{ key: "users", route: "/catalogs/users" }],
    roles: ["super_admin", "admin"],
    platforms: ["web"],
  },
  {
    key: "logbook",
    icon: "ClipboardList",
    route: "/logbook",
    subItems: [
      { key: "visitors", route: "/logbook/visitors" },
      { key: "providers", route: "/logbook/providers" },
      { key: "residents", route: "/logbook/residents" },
    ],
    roles: ["super_admin", "admin"],
    platforms: ["web"],
  },
  {
    key: "visits-and-residents",
    icon: "Users",
    route: "/visits-and-residents",
    roles: ["super_admin", "admin"],
    platforms: ["web"],
  },
  {
    key: "projects",
    icon: "FolderKanban",
    route: "/projects",
    roles: ["super_admin", "admin"],
    platforms: ["web"],
  },
  {
    key: "wifi",
    icon: "Wifi",
    route: "/wifi",
    roles: ["super_admin", "admin"],
    platforms: ["web"],
  },
  {
    key: "complaints",
    icon: "MessageSquare",
    route: "/complaints",
    roles: ["super_admin", "admin", "resident"],
    platforms: ["web", "mobile"],
  },
  {
    key: "patrols",
    icon: "Route",
    route: "/patrols",
    roles: ["super_admin", "admin", "guard"],
    platforms: ["desktop", "mobile"],
  },
  {
    key: "amenities",
    icon: "CalendarDays",
    route: "/amenities",
    roles: ["super_admin", "admin", "resident"],
    platforms: ["web", "mobile"],
  },
  {
    key: "announcements",
    icon: "Megaphone",
    route: "/announcements",
    roles: ["super_admin", "admin"],
    platforms: ["web"],
  },
  {
    key: "lost-and-found",
    icon: "Search",
    route: "/lost-and-found",
    roles: ["super_admin", "admin"],
    platforms: ["web"],
  },
  {
    key: "history",
    icon: "History",
    route: "/history",
    roles: ["super_admin", "admin"],
    platforms: ["web"],
  },
  {
    key: "blacklist",
    icon: "ShieldAlert",
    route: "/blacklist",
    roles: ["super_admin", "admin"],
    platforms: ["web"],
  },
  {
    key: "access-log",
    icon: "DoorOpen",
    route: "/access-log",
    subItems: [
      { key: "visitors", route: "/access-log/visitors" },
      { key: "providers", route: "/access-log/providers" },
      { key: "residents", route: "/access-log/residents" },
    ],
    roles: ["guard"],
    platforms: ["desktop", "web"],
  },
  {
    key: "my-visits",
    icon: "Eye",
    route: "/my-visits",
    roles: ["resident"],
    platforms: ["web", "mobile"],
  },
];

export function getItemsForPlatform(platform: Platform): SidebarItem[] {
  return sidebarItems.filter((item) => item.platforms.includes(platform));
}

export function getItemsForRole(
  role: Role,
  platform: Platform,
): SidebarItem[] {
  return sidebarItems.filter(
    (item) =>
      item.roles.includes(role) && item.platforms.includes(platform),
  );
}

export const UNIVERSAL_ROUTES: readonly string[] = [
  "/dashboard",
  "/account",
  "/unauthorized",
];

export function getAllowedRoutes(
  role: Role,
  platform: Platform,
): string[] {
  return getItemsForRole(role, platform).map((item) => item.route);
}

export function isRouteAllowedForRole(
  pathname: string,
  role: Role,
  platform: Platform,
): boolean {
  if (UNIVERSAL_ROUTES.some((route) => pathname.startsWith(route))) {
    return true;
  }

  const platformItems = sidebarItems.filter((item) =>
    item.platforms.includes(platform),
  );

  for (const item of platformItems) {
    if (pathname.startsWith(item.route)) {
      return item.roles.includes(role);
    }
  }

  return true;
}
