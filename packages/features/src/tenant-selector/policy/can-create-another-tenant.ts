import type { Role } from "../../adapters/role";

/**
 * Returns true when the actor is allowed to create another tenant.
 * Replace `existingTenantsCount === 0` with `tier.allowsAdditionalTenants` when subscription tiers ship (FR-025).
 */
export function canCreateAnotherTenant(role: Role, existingTenantsCount: number): boolean {
  if (role === "SuperAdmin") return true;
  if (role === "Admin") return existingTenantsCount === 0;
  return false;
}
