export { TenantSelector } from "./components/tenant-selector";
export { TenantSelectorTrigger } from "./components/tenant-selector-trigger";
export { ConfirmSwitchDialog } from "./components/confirm-switch-dialog";
export { useTenantList } from "./hooks/use-tenant-list";
export { useActiveTenant } from "./hooks/use-active-tenant";
export { useTenantSwitch } from "./hooks/use-tenant-switch";
export type { ActiveTenant } from "./hooks/use-active-tenant";

export type { AuthStorePort } from "../adapters/tenant-selector-adapters";
export { AuthStoreProvider, useAuthStore } from "../adapters/tenant-selector-adapters";

export { UnsavedChangesProvider, useUnsavedChanges } from "../adapters/unsaved-changes";
export type { UnsavedChangesPort } from "../adapters/unsaved-changes";
