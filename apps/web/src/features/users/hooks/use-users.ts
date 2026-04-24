"use client";

import { useQuery } from "@tanstack/react-query";
import type { UserFilters, PaginatedResponse, ExtendedUserProfile } from "@ramcar/shared";
import { useActiveTenant } from "@ramcar/features";
import { apiClient } from "@/shared/lib/api-client";

export function useUsers(filters: UserFilters) {
  const { activeTenantId } = useActiveTenant();
  return useQuery<PaginatedResponse<ExtendedUserProfile>>({
    queryKey: ["users", activeTenantId, "list", filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<ExtendedUserProfile>>("/users", {
        params: filters as Record<string, unknown>,
      }),
    enabled: !!activeTenantId,
  });
}
