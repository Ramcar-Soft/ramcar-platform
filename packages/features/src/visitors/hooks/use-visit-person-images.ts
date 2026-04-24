import { useQuery } from "@tanstack/react-query";
import type { VisitPersonImage } from "@ramcar/shared";
import { useTransport } from "../../adapters";
import { useActiveTenant } from "../../tenant-selector/hooks/use-active-tenant";

export function useVisitPersonImages(visitPersonId: string | null) {
  const transport = useTransport();
  const { activeTenantId } = useActiveTenant();
  return useQuery<VisitPersonImage[]>({
    queryKey: ["access-events", activeTenantId, "images", visitPersonId],
    queryFn: () =>
      transport.get<VisitPersonImage[]>(`/visit-persons/${visitPersonId!}/images`),
    enabled: !!activeTenantId && !!visitPersonId,
  });
}
