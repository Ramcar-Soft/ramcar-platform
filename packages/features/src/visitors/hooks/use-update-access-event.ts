import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AccessEvent, UpdateAccessEventInput } from "@ramcar/shared";
import { useTransport } from "../../adapters";
import { useActiveTenant } from "../../tenant-selector/hooks/use-active-tenant";

export function useUpdateAccessEvent() {
  const queryClient = useQueryClient();
  const transport = useTransport();
  const { activeTenantId } = useActiveTenant();

  return useMutation({
    mutationFn: ({ id, ...data }: UpdateAccessEventInput & { id: string }) =>
      transport.patch<AccessEvent>(`/access-events/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-events", activeTenantId] });
    },
  });
}
