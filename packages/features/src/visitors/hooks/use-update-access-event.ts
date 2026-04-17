import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AccessEvent, UpdateAccessEventInput } from "@ramcar/shared";
import { useTransport, useRole } from "../../adapters";

export function useUpdateAccessEvent() {
  const queryClient = useQueryClient();
  const transport = useTransport();
  const { tenantId } = useRole();

  return useMutation({
    mutationFn: ({ id, ...data }: UpdateAccessEventInput & { id: string }) =>
      transport.patch<AccessEvent>(`/access-events/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-events", tenantId] });
    },
  });
}
