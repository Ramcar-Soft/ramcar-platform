import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { VisitPerson, UpdateVisitPersonInput } from "@ramcar/shared";
import { apiClient } from "../../../shared/lib/api-client";

export function useUpdateVisitPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateVisitPersonInput }) =>
      apiClient.patch<VisitPerson>(`/visit-persons/${id}`, patch),
    onSuccess: (_updated, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["visit-persons"] });
      queryClient.invalidateQueries({ queryKey: ["visit-person", id] });
    },
  });
}
