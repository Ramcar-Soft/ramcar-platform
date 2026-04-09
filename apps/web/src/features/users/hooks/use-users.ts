"use client";

import { useQuery } from "@tanstack/react-query";
import type { UserFilters, PaginatedResponse, ExtendedUserProfile } from "@ramcar/shared";
import { apiClient } from "@/shared/lib/api-client";

export function useUsers(filters: UserFilters) {
  return useQuery<PaginatedResponse<ExtendedUserProfile>>({
    queryKey: ["users", "list", filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<ExtendedUserProfile>>("/users", {
        params: filters as Record<string, unknown>,
      }),
  });
}
