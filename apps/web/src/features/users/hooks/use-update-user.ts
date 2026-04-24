"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ExtendedUserProfile, UpdateUserInput } from "@ramcar/shared";
import { useActiveTenant } from "@ramcar/features";
import { apiClient } from "@/shared/lib/api-client";

export function useUpdateUser(profileId: string) {
  const queryClient = useQueryClient();
  const { activeTenantId } = useActiveTenant();

  return useMutation({
    mutationFn: (data: UpdateUserInput) =>
      apiClient.put<{ success: boolean; user: ExtendedUserProfile }>(
        `/users/${profileId}`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", activeTenantId] });
    },
  });
}
