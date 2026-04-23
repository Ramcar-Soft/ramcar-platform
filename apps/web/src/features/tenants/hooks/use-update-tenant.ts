"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";
import type { UpdateTenantInput, Tenant } from "../types";

export function useUpdateTenant(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation<Tenant, Error, UpdateTenantInput>({
    mutationFn: (dto) => apiClient.patch<Tenant>(`/tenants/${tenantId}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["tenants", tenantId] });
    },
  });
}
