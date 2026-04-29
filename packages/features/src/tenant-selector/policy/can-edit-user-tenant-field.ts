import type { Role } from "../../adapters/role";

/** Returns true when the creator can freely edit the tenant assignment field. Replace body when tiers ship (FR-025). */
export function canEditUserTenantField(role: Role): boolean {
  return role === "SuperAdmin";
}
