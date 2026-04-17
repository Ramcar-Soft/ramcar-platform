import { useQuery } from "@tanstack/react-query";
import type { AccessEvent } from "@ramcar/shared";
import { useTransport, useRole } from "../../adapters";

export function useRecentVisitPersonEvents(visitPersonId: string | null) {
  const transport = useTransport();
  const { tenantId } = useRole();
  return useQuery<AccessEvent[]>({
    queryKey: ["access-events", tenantId, "recent-visit-person", visitPersonId],
    queryFn: () =>
      transport.get<AccessEvent[]>(
        `/access-events/recent-visit-person/${visitPersonId}`,
      ),
    enabled: !!visitPersonId,
  });
}
