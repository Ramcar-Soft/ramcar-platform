import { useQuery } from "@tanstack/react-query";
import type { AccessEvent } from "@ramcar/shared";
import { apiClient } from "../../../shared/lib/api-client";

export function useRecentVisitPersonEvents(visitPersonId: string | null) {
  return useQuery<AccessEvent[]>({
    queryKey: ["access-events", "recent-visit-person", visitPersonId],
    queryFn: () =>
      apiClient.get<AccessEvent[]>(
        `/access-events/recent-visit-person/${visitPersonId!}`,
      ),
    enabled: !!visitPersonId,
  });
}
