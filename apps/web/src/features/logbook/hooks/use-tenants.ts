"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";

interface Tenant {
  id: string;
  name: string;
}

/**
 * Minimal tenants list hook for the Logbook feature.
 *
 * NOTE: a sibling copy lives in `apps/web/src/features/users/hooks/use-tenants.ts`.
 * Per CLAUDE.md the `logbook` feature MUST NOT import from the `users` feature,
 * so this file intentionally duplicates the hook rather than reaching across
 * feature boundaries.
 */
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
