import { useQuery } from "@tanstack/react-query";
import type { PaginatedResponse, VisitPerson, VisitPersonFiltersInput } from "@ramcar/shared";
import { useActiveTenant } from "@ramcar/features";
import { apiClient } from "../../../shared/lib/api-client";

export function useVisitPersons(filters: VisitPersonFiltersInput) {
  const { activeTenantId } = useActiveTenant();
  return useQuery<PaginatedResponse<VisitPerson>>({
    queryKey: ["visit-persons", activeTenantId, filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<VisitPerson>>("/visit-persons", {
        params: filters as Record<string, unknown>,
      }),
    enabled: !!activeTenantId,
  });
}
