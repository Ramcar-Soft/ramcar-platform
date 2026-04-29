// Single source of truth for the three v1 tenant-scope policy rules.
// Replace function bodies here when subscription tiers / per-account permissions ship (FR-025).
export { canShowTenantSelector } from "./can-show-tenant-selector";
export { canCreateAnotherTenant } from "./can-create-another-tenant";
export { canEditUserTenantField } from "./can-edit-user-tenant-field";
