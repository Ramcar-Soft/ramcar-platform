import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { VisitPerson, CreateVisitPersonInput } from "@ramcar/shared";
import { useTransport } from "../../adapters";
import { useActiveTenant } from "../../tenant-selector/hooks/use-active-tenant";

export function useCreateVisitPerson() {
  const queryClient = useQueryClient();
  const transport = useTransport();
  const { activeTenantId } = useActiveTenant();

  return useMutation({
    mutationFn: (data: CreateVisitPersonInput) =>
      transport.post<VisitPerson>("/visit-persons", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visit-persons", activeTenantId] });
    },
  });
}
