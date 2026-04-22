"use client";

import { useQuery } from "@tanstack/react-query";
import type { Vehicle } from "@ramcar/shared";
import { useRole } from "@ramcar/features/adapters";
import { apiClient } from "@/shared/lib/api-client";

export function useResidentVehicles(residentId: string | null) {
  const { tenantId } = useRole();
  return useQuery<Vehicle[]>({
    queryKey: ["vehicles", tenantId, "resident", residentId],
    queryFn: () =>
      apiClient.get<Vehicle[]>(`/residents/${residentId}/vehicles`),
    enabled: !!residentId,
  });
}
