"use client";

import { useQuery } from "@tanstack/react-query";
import type { Vehicle } from "@ramcar/shared";
import { apiClient } from "@/shared/lib/api-client";

export function useResidentVehicles(residentId: string | null) {
  return useQuery<Vehicle[]>({
    queryKey: ["residents", residentId, "vehicles"],
    queryFn: () =>
      apiClient.get<Vehicle[]>(`/residents/${residentId}/vehicles`),
    enabled: !!residentId,
  });
}
