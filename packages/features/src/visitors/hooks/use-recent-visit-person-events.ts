import { useQuery } from "@tanstack/react-query";
import type { AccessEvent } from "@ramcar/shared";
import { useTransport } from "../../adapters";
import { useActiveTenant } from "../../tenant-selector/hooks/use-active-tenant";

export function useRecentVisitPersonEvents(visitPersonId: string | null) {
  const transport = useTransport();
  const { activeTenantId } = useActiveTenant();
  return useQuery<AccessEvent[]>({
    queryKey: ["access-events", activeTenantId, "recent-visit-person", visitPersonId],
    queryFn: () =>
      transport.get<AccessEvent[]>(
        `/access-events/recent-visit-person/${visitPersonId}`,
      ),
    enabled: !!activeTenantId && !!visitPersonId,
  });
}
