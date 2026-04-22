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
  const user = useAppStore((s) => s.user);
  const actorRole = user?.role ?? "admin";
  const actorTenantId = user?.tenantId ?? "";
  const scopeKey =
    actorRole === "super_admin" ? (filters.tenantId ?? "ALL") : actorTenantId;

  return useQuery<AccessEventListResponse>({
    queryKey: ["access-events", scopeKey, personType, filters],
    queryFn: () =>
      apiClient.get<AccessEventListResponse>("/access-events", {
        params: {
          personType,
          page: filters.page,
          pageSize: filters.pageSize,
          ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
          ...(filters.dateTo && { dateTo: filters.dateTo }),
          ...(filters.tenantId && { tenantId: filters.tenantId }),
          ...(filters.residentId && { residentId: filters.residentId }),
          ...(filters.search && { search: filters.search }),
        } as Record<string, unknown>,
      }),
    enabled: Boolean(actorTenantId || actorRole === "super_admin"),
  });
}
