"use client";

import { useQuery } from "@tanstack/react-query";
import type { Vehicle } from "@ramcar/shared";
import { apiClient } from "@/shared/lib/api-client";

export function useVisitPersonVehicles(visitPersonId: string | null) {
  return useQuery<Vehicle[]>({
    queryKey: ["vehicles", "visit-person", visitPersonId],
    queryFn: () =>
      apiClient.get<Vehicle[]>("/vehicles", {
        params: { visitPersonId: visitPersonId! },
      }),
    enabled: !!visitPersonId,
  });
}
