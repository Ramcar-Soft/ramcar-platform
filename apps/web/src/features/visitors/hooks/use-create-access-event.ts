"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AccessEvent, CreateAccessEventInput } from "@ramcar/shared";
import { apiClient } from "@/shared/lib/api-client";

export function useCreateAccessEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAccessEventInput) =>
      apiClient.post<AccessEvent>("/access-events", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-events"] });
    },
  });
}
