"use client";

import { useQuery } from "@tanstack/react-query";
import type { ExtendedUserProfile } from "@ramcar/shared";
import { apiClient } from "@/shared/lib/api-client";

export function useGetUser(id: string, options?: { enabled?: boolean }) {
  return useQuery<ExtendedUserProfile>({
    queryKey: ["users", id],
    queryFn: () => apiClient.get<ExtendedUserProfile>(`/users/${id}`),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}
