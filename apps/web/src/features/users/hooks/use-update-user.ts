"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ExtendedUserProfile, UpdateUserInput } from "@ramcar/shared";
import { apiClient } from "@/shared/lib/api-client";

export function useUpdateUser(profileId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserInput) =>
      apiClient.put<{ success: boolean; user: ExtendedUserProfile }>(
        `/users/${profileId}`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
