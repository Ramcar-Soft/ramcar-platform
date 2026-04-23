"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";
import type { Tenant } from "../types";

export function useDeleteTenantImage(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation<Tenant, Error, void>({
    mutationFn: () => apiClient.delete<Tenant>(`/tenants/${tenantId}/image`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["tenants", tenantId] });
    },
  });
}
