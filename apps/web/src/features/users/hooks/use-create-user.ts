"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveTenant } from "@ramcar/features";
import { apiClient } from "@/shared/lib/api-client";
import type { CreateUserInput, ExtendedUserProfile } from "@ramcar/shared";

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { activeTenantId } = useActiveTenant();

  return useMutation({
    mutationFn: (data: CreateUserInput) =>
      apiClient.post<ExtendedUserProfile>("/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", activeTenantId] });
    },
  });
}
