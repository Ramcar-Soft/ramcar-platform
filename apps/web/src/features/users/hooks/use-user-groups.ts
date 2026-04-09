"use client";

import { useQuery } from "@tanstack/react-query";
import type { UserGroup } from "@ramcar/shared";
import { apiClient } from "@/shared/lib/api-client";

export function useUserGroups() {
  return useQuery<UserGroup[]>({
    queryKey: ["user-groups"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: UserGroup[] }>("/user-groups");
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
