import { useQuery } from "@tanstack/react-query";
import type { PaginatedResponse, ExtendedUserProfile, ResidentFiltersInput } from "@ramcar/shared";
import { apiClient } from "../../../shared/lib/api-client";

export function useResidents(filters: ResidentFiltersInput) {
  return useQuery<PaginatedResponse<ExtendedUserProfile>>({
    queryKey: ["residents", "list", filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<ExtendedUserProfile>>("/residents", {
        params: filters as Record<string, unknown>,
      }),
  });
}
