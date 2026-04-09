"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ExtendedUserProfile, UserStatus } from "@ramcar/shared";
import { apiClient } from "@/shared/lib/api-client";

export function useToggleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      apiClient.patch<{ success: boolean; user: ExtendedUserProfile }>(
        `/users/${id}/status`,
        { status },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
