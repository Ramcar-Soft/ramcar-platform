import { useQuery } from "@tanstack/react-query";
import type { AccessEvent } from "@ramcar/shared";
import { useActiveTenant } from "@ramcar/features";
import { apiClient } from "../../../shared/lib/api-client";

export function useRecentAccessEvents(userId: string | null) {
  const { activeTenantId } = useActiveTenant();
  return useQuery<AccessEvent[]>({
    queryKey: ["access-events", activeTenantId, "recent", userId],
    queryFn: () =>
      apiClient.get<AccessEvent[]>(`/access-events/recent/${userId}`),
    enabled: !!userId && !!activeTenantId,
  });
}
