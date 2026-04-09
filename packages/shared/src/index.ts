export type { Role, UserProfile, AuthSession } from "./types/auth";
export { loginSchema, type LoginInput } from "./validators/auth";
export { extractUserProfile } from "./utils/extract-user-profile";
export type {
  Platform,
  SidebarItem,
  SidebarSubItem,
} from "./navigation";
export {
  sidebarItems,
  getItemsForPlatform,
  getItemsForRole,
  UNIVERSAL_ROUTES,
  getAllowedRoutes,
  isRouteAllowedForRole,
} from "./navigation";
