"use client";

import { useQuery } from "@tanstack/react-query";
import type { AccessEvent } from "@ramcar/shared";
import { apiClient } from "@/shared/lib/api-client";

export function useLastAccessEvent(userId: string | null) {
  return useQuery<AccessEvent | null>({
    queryKey: ["access-events", "last", userId],
    queryFn: () =>
      apiClient.get<AccessEvent | null>(`/access-events/last/${userId}`),
    enabled: !!userId,
  });
}
