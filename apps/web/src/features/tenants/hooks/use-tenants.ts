"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@ramcar/store";
import { apiClient } from "@/shared/lib/api-client";
import type { TenantListQuery } from "../types";

interface PaginatedTenantsResponse {
  data: {
    id: string;
    name: string;
    slug: string;
    address: string;
    status: "active" | "inactive";
    config: Record<string, unknown>;
    image_path: string | null;
    time_zone: string;
    created_at: string;
    updated_at: string;
  }[];
  meta: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export function useTenants(filters: Partial<TenantListQuery> = {}) {
  const activeTenantId = useAppStore((s) => s.activeTenantId);

  return useQuery<PaginatedTenantsResponse>({
    queryKey: ["tenants", activeTenantId, filters],
    queryFn: () =>
      apiClient.get<PaginatedTenantsResponse>("/tenants", {
        params: {
          ...(filters.search && { search: filters.search }),
          status: filters.status ?? "active",
          page: filters.page ?? 1,
          page_size: filters.page_size ?? 25,
          ...(filters.scope && { scope: filters.scope }),
          ...(filters.include_inactive !== undefined && { include_inactive: filters.include_inactive }),
        } as Record<string, unknown>,
      }),
  });
}
