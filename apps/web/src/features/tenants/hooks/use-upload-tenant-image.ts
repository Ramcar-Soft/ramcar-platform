"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";
import type { Tenant } from "../types";

export function useUploadTenantImage(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation<Tenant, Error, File>({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.upload<Tenant>(`/tenants/${tenantId}/image`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["tenants", tenantId] });
    },
  });
}
