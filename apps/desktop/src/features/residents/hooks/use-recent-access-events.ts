import { useQuery } from "@tanstack/react-query";
import type { AccessEvent } from "@ramcar/shared";
import { apiClient } from "../../../shared/lib/api-client";

export function useRecentAccessEvents(userId: string | null) {
  return useQuery<AccessEvent[]>({
    queryKey: ["access-events", "recent", userId],
    queryFn: () =>
      apiClient.get<AccessEvent[]>(`/access-events/recent/${userId}`),
    enabled: !!userId,
  });
}
