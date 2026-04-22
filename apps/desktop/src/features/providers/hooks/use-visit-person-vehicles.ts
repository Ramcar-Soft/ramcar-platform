import { useQuery } from "@tanstack/react-query";
import type { Vehicle } from "@ramcar/shared";
import { useRole } from "@ramcar/features/adapters";
import { apiClient } from "../../../shared/lib/api-client";

export function useVisitPersonVehicles(visitPersonId: string | null) {
  const { tenantId } = useRole();
  return useQuery<Vehicle[]>({
    queryKey: ["vehicles", tenantId, "visit-person", visitPersonId],
    queryFn: () =>
      apiClient.get<Vehicle[]>("/vehicles", {
        params: { visitPersonId: visitPersonId! },
      }),
    enabled: !!visitPersonId,
  });
}
