"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AccessEvent, UpdateAccessEventInput } from "@ramcar/shared";
import { apiClient } from "@/shared/lib/api-client";

export function useUpdateAccessEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: UpdateAccessEventInput & { id: string }) =>
      apiClient.patch<AccessEvent>(`/access-events/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-events"] });
    },
  });
}
