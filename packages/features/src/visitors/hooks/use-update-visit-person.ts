import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { VisitPerson, UpdateVisitPersonInput } from "@ramcar/shared";
import { useTransport, useRole } from "../../adapters";

export function useUpdateVisitPerson() {
  const queryClient = useQueryClient();
  const transport = useTransport();
  const { tenantId } = useRole();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateVisitPersonInput }) =>
      transport.patch<VisitPerson>(`/visit-persons/${id}`, patch),
    onSuccess: (_updated, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["visit-persons", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["visit-person", tenantId, id] });
    },
  });
}
