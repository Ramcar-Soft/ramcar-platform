"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AccessEvent, CreateAccessEventInput } from "@ramcar/shared";
import { useActiveTenant } from "@ramcar/features";
import { apiClient } from "@/shared/lib/api-client";

export function useCreateAccessEvent() {
  const queryClient = useQueryClient();
  const { activeTenantId } = useActiveTenant();

  return useMutation({
    mutationFn: (data: CreateAccessEventInput) =>
      apiClient.post<AccessEvent>("/access-events", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-events", activeTenantId] });
    },
  });
}
