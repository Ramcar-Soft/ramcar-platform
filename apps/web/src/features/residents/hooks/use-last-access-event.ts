"use client";

import { useQuery } from "@tanstack/react-query";
import type { AccessEvent } from "@ramcar/shared";
import { useActiveTenant } from "@ramcar/features";
import { apiClient } from "@/shared/lib/api-client";

export function useLastAccessEvent(userId: string | null) {
  const { activeTenantId } = useActiveTenant();
  return useQuery<AccessEvent | null>({
    queryKey: ["access-events", activeTenantId, "last", userId],
    queryFn: () =>
      apiClient.get<AccessEvent | null>(`/access-events/last/${userId}`),
    enabled: !!activeTenantId && !!userId,
  });
}
