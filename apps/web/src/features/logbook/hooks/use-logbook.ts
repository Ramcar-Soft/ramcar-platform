"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@ramcar/store";
import { apiClient } from "@/shared/lib/api-client";
import type { AccessEventListResponse } from "@ramcar/shared";
import type { LogbookFilters } from "../types";

export function useLogbook(
  personType: "visitor" | "service_provider" | "resident",
  filters: LogbookFilters,
) {
  const activeTenantId = useAppStore((s) => s.activeTenantId);

  return useQuery<AccessEventListResponse>({
    queryKey: ["access-events", activeTenantId, personType, filters],
    queryFn: () =>
      apiClient.get<AccessEventListResponse>("/access-events", {
        params: {
          personType,
          page: filters.page,
          pageSize: filters.pageSize,
          ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
          ...(filters.dateTo && { dateTo: filters.dateTo }),
          ...(filters.residentId && { residentId: filters.residentId }),
          ...(filters.search && { search: filters.search }),
        } as Record<string, unknown>,
      }),
    enabled: Boolean(activeTenantId),
  });
}
