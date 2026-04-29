import type { Role } from "../../adapters/role";

/** Returns true only for SuperAdmin. Replace body with `tier.allowsMultiTenantUI` when subscription tiers ship (FR-025). */
export function canShowTenantSelector(role: Role): boolean {
  return role === "SuperAdmin";
}
