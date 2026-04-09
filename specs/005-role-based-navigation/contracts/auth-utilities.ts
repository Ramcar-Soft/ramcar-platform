/**
 * Contract: Auth Utilities for @ramcar/shared
 *
 * These interfaces define the public API for auth-related utilities
 * that will be added to the shared package.
 */

import type { Role, UserProfile } from "../types/auth";
import type { Platform } from "../navigation/sidebar-config";

// ---------------------------------------------------------------------------
// extractUserProfile — packages/shared/src/utils/extract-user-profile.ts
// ---------------------------------------------------------------------------

/**
 * Minimal Supabase user shape required for profile extraction.
 * Avoids coupling to the full Supabase User type.
 */
interface SupabaseUserLike {
  id: string;
  email?: string;
  app_metadata: Record<string, unknown>;
}

/**
 * Extracts a UserProfile from Supabase auth user metadata.
 *
 * Field mapping:
 * - app_metadata.profile_id → id (fallback: user.id)
 * - user.id → userId
 * - app_metadata.tenant_id → tenantId (fallback: "")
 * - user.email → email (fallback: "")
 * - app_metadata.full_name → fullName (fallback: "")
 * - app_metadata.role → role (fallback: "resident")
 */
export declare function extractUserProfile(
  user: SupabaseUserLike,
): UserProfile;

// ---------------------------------------------------------------------------
// Route Authorization — packages/shared/src/navigation/sidebar-config.ts
// ---------------------------------------------------------------------------

/**
 * Routes accessible to any authenticated user regardless of role.
 * These are NOT gated by the sidebar items config.
 */
export declare const UNIVERSAL_ROUTES: readonly string[];
// Expected value: ["/dashboard", "/account", "/unauthorized"]

/**
 * Returns all route prefixes the given role can access on the given platform.
 * Derived from sidebarItems filtered by role and platform.
 * Does NOT include universal routes — callers should check both.
 */
export declare function getAllowedRoutes(
  role: Role,
  platform: Platform,
): string[];

/**
 * Checks if a pathname is accessible for a given role on a given platform.
 *
 * Logic:
 * 1. If pathname starts with any UNIVERSAL_ROUTES entry → true
 * 2. For each sidebarItem where item.platforms includes platform:
 *    - If pathname starts with item.route:
 *      - Return item.roles.includes(role)
 * 3. If no sidebar item matches → true (route is not restricted by sidebar config)
 */
export declare function isRouteAllowedForRole(
  pathname: string,
  role: Role,
  platform: Platform,
): boolean;
