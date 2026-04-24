"use client";

import { useQuery } from "@tanstack/react-query";
import type { PaginatedResponse, ExtendedUserProfile, ResidentFiltersInput } from "@ramcar/shared";
import { useActiveTenant } from "@ramcar/features";
import { apiClient } from "@/shared/lib/api-client";

export function useResidents(filters: ResidentFiltersInput) {
  const { activeTenantId } = useActiveTenant();
  return useQuery<PaginatedResponse<ExtendedUserProfile>>({
    queryKey: ["residents", activeTenantId, "list", filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<ExtendedUserProfile>>("/residents", {
        params: filters as Record<string, unknown>,
      }),
    enabled: !!activeTenantId,
  });
}
