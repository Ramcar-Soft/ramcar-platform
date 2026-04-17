import { useQuery } from "@tanstack/react-query";
import type { Vehicle } from "@ramcar/shared";
import { useTransport, useRole } from "../../adapters";

export function useVisitPersonVehicles(visitPersonId: string | null) {
  const transport = useTransport();
  const { tenantId } = useRole();
  return useQuery<Vehicle[]>({
    queryKey: ["vehicles", tenantId, "visit-person", visitPersonId],
    queryFn: () =>
      transport.get<Vehicle[]>("/vehicles", {
        params: { visitPersonId: visitPersonId! },
      }),
    enabled: !!visitPersonId,
  });
}
