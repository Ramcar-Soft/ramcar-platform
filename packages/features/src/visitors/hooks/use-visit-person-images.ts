import { useQuery } from "@tanstack/react-query";
import type { VisitPersonImage } from "@ramcar/shared";
import { useTransport, useRole } from "../../adapters";

export function useVisitPersonImages(visitPersonId: string | null) {
  const transport = useTransport();
  const { tenantId } = useRole();
  return useQuery<VisitPersonImage[]>({
    queryKey: ["access-events", tenantId, "images", visitPersonId],
    queryFn: () =>
      transport.get<VisitPersonImage[]>(`/visit-persons/${visitPersonId!}/images`),
    enabled: !!visitPersonId,
  });
}
