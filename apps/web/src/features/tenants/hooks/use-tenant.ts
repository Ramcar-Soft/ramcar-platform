"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";
import type { Tenant } from "../types";

export function useTenant(tenantId: string | undefined, open: boolean, mode: "create" | "edit") {
  return useQuery<Tenant>({
    queryKey: ["tenants", tenantId],
    queryFn: () => apiClient.get<Tenant>(`/tenants/${tenantId}`),
    enabled: Boolean(open && mode === "edit" && tenantId),
  });
}
