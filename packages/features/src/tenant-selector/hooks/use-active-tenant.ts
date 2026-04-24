import { useAuthStore } from "../../adapters/tenant-selector-adapters";

export interface ActiveTenant {
  activeTenantId: string;
  activeTenantName: string;
  tenantIds: string[];
}

export function useActiveTenant(): ActiveTenant {
  const { activeTenantId, activeTenantName, tenantIds } = useAuthStore();
  return { activeTenantId, activeTenantName, tenantIds };
}
