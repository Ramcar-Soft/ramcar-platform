import { useQuery } from "@tanstack/react-query";
import type { Vehicle } from "@ramcar/shared";
import { useTransport } from "../../adapters";
import { useActiveTenant } from "../../tenant-selector/hooks/use-active-tenant";

export function useVisitPersonVehicles(visitPersonId: string | null) {
  const transport = useTransport();
  const { activeTenantId } = useActiveTenant();
  return useQuery<Vehicle[]>({
    queryKey: ["vehicles", activeTenantId, "visit-person", visitPersonId],
    queryFn: () =>
      transport.get<Vehicle[]>("/vehicles", {
        params: { visitPersonId: visitPersonId! },
      }),
    enabled: !!activeTenantId && !!visitPersonId,
  });
}
