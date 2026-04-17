import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { VisitPerson, CreateVisitPersonInput } from "@ramcar/shared";
import { useTransport, useRole } from "../../adapters";

export function useCreateVisitPerson() {
  const queryClient = useQueryClient();
  const transport = useTransport();
  const { tenantId } = useRole();

  return useMutation({
    mutationFn: (data: CreateVisitPersonInput) =>
      transport.post<VisitPerson>("/visit-persons", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visit-persons", tenantId] });
    },
  });
}
