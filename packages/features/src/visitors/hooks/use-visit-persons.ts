import { useQuery } from "@tanstack/react-query";
import type { PaginatedResponse, VisitPerson, VisitPersonFiltersInput } from "@ramcar/shared";
import { useTransport } from "../../adapters";
import { useActiveTenant } from "../../tenant-selector/hooks/use-active-tenant";

export function useVisitPersons(filters: VisitPersonFiltersInput) {
  const transport = useTransport();
  const { activeTenantId } = useActiveTenant();
  return useQuery<PaginatedResponse<VisitPerson>>({
    queryKey: ["visit-persons", activeTenantId, "list", filters],
    queryFn: () =>
      transport.get<PaginatedResponse<VisitPerson>>("/visit-persons", {
        params: filters as Record<string, unknown>,
      }),
    enabled: !!activeTenantId,
  });
}
