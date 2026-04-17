import { useQuery } from "@tanstack/react-query";
import type { PaginatedResponse, VisitPerson, VisitPersonFiltersInput } from "@ramcar/shared";
import { useTransport, useRole } from "../../adapters";

export function useVisitPersons(filters: VisitPersonFiltersInput) {
  const transport = useTransport();
  const { tenantId } = useRole();
  return useQuery<PaginatedResponse<VisitPerson>>({
    queryKey: ["visit-persons", tenantId, "list", filters],
    queryFn: () =>
      transport.get<PaginatedResponse<VisitPerson>>("/visit-persons", {
        params: filters as Record<string, unknown>,
      }),
  });
}
