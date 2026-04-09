"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";

interface Tenant {
  id: string;
  name: string;
}

export function useTenants() {
  return useQuery<Tenant[]>({
    queryKey: ["tenants"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Tenant[] }>("/tenants");
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
