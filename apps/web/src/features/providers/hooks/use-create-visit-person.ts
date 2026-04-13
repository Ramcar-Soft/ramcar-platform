"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { VisitPerson, CreateVisitPersonInput } from "@ramcar/shared";
import { apiClient } from "@/shared/lib/api-client";

export function useCreateVisitPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVisitPersonInput) =>
      apiClient.post<VisitPerson>("/visit-persons", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visit-persons"] });
    },
  });
}
