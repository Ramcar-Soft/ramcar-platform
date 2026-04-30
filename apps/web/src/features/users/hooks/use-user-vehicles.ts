"use client";

import { useQuery } from "@tanstack/react-query";
import type { Vehicle } from "@ramcar/shared";
import { useRole } from "@ramcar/features/adapters";
import { apiClient } from "@/shared/lib/api-client";

export function useUserVehicles(userId: string | null, enabled = true) {
  const { tenantId } = useRole();
  return useQuery<Vehicle[]>({
    queryKey: ["vehicles", tenantId, "resident", userId],
    queryFn: () =>
      apiClient.get<Vehicle[]>("/vehicles", { params: { userId: userId! } }),
    enabled: enabled && !!userId,
  });
}
