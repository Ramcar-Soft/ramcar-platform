"use client";

import { useQuery } from "@tanstack/react-query";
import type { VisitPersonImage } from "@ramcar/shared";
import { apiClient } from "@/shared/lib/api-client";

export function useVisitPersonImages(visitPersonId: string | null) {
  return useQuery<VisitPersonImage[]>({
    queryKey: ["access-events", "images", visitPersonId],
    queryFn: () =>
      apiClient.get<VisitPersonImage[]>(`/visit-persons/${visitPersonId!}/images`),
    enabled: !!visitPersonId,
  });
}
