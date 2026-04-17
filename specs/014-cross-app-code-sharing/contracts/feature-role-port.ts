/**
 * Contract: RolePort
 *
 * Provides shared hooks with tenant + role + user context pulled from the
 * host's session. Never resolved by @ramcar/features itself (Constitution Principle VI).
 *
 * Rules:
 *  - tenantId and userId are UUID strings; hosts MUST NOT pass empty strings
 *    inside an authenticated render tree.
 *  - role is one of the four constitution-defined values. Unknown values should be
 *    normalized to "Resident" (least privilege) by the host before injection.
 *  - Shared hooks use tenantId as the second segment of every TanStack Query key:
 *      ["visit-persons", tenantId, "list", filters]
 *    (mirrors existing convention in apps/web and apps/desktop.)
 *  - Role-gated UI is injected by the host via slot props. Shared components
 *    MUST NOT inspect `role` to decide what to render.
 *  - Shared hooks MAY inspect `role` when the API itself filters by role
 *    (e.g., a "mine only" list for Residents) — but ONLY for query-key disambiguation,
 *    not for visibility decisions.
 */

export type Role = "SuperAdmin" | "Admin" | "Guard" | "Resident";

export interface RolePort {
  role: Role;
  tenantId: string;
  userId: string;
}

export interface UseRole {
  (): RolePort;
}
