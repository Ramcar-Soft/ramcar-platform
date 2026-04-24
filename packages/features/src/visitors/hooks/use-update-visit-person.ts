import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { VisitPerson, UpdateVisitPersonInput } from "@ramcar/shared";
import { useTransport } from "../../adapters";
import { useActiveTenant } from "../../tenant-selector/hooks/use-active-tenant";

export function useUpdateVisitPerson() {
  const queryClient = useQueryClient();
  const transport = useTransport();
  const { activeTenantId } = useActiveTenant();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateVisitPersonInput }) =>
      transport.patch<VisitPerson>(`/visit-persons/${id}`, patch),
    onSuccess: (_updated, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["visit-persons", activeTenantId] });
      queryClient.invalidateQueries({ queryKey: ["visit-person", activeTenantId, id] });
    },
  });
}
