"use client";

import { useQuery } from "@tanstack/react-query";
import type { ExtendedUserProfile } from "@ramcar/shared";
import { useActiveTenant } from "@ramcar/features";
import { apiClient } from "@/shared/lib/api-client";

export function useGetUser(id: string, options?: { enabled?: boolean }) {
  const { activeTenantId } = useActiveTenant();
  const isEnabled = !!activeTenantId && (options?.enabled !== undefined ? options.enabled : !!id);
  return useQuery<ExtendedUserProfile>({
    queryKey: ["users", activeTenantId, id],
    queryFn: () => apiClient.get<ExtendedUserProfile>(`/users/${id}`),
    enabled: isEnabled,
  });
}
