import { useQuery } from "@tanstack/react-query";
import type { PaginatedResponse, VisitPerson, VisitPersonFiltersInput } from "@ramcar/shared";
import { apiClient } from "../../../shared/lib/api-client";

export function useVisitPersons(filters: VisitPersonFiltersInput) {
  return useQuery<PaginatedResponse<VisitPerson>>({
    queryKey: ["visit-persons", filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<VisitPerson>>("/visit-persons", {
        params: filters as Record<string, unknown>,
      }),
  });
}
