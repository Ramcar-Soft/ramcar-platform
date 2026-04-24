import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AccessEvent, CreateAccessEventInput } from "@ramcar/shared";
import { useTransport } from "../../adapters";
import { useActiveTenant } from "../../tenant-selector/hooks/use-active-tenant";

export function useCreateAccessEvent() {
  const queryClient = useQueryClient();
  const transport = useTransport();
  const { activeTenantId } = useActiveTenant();

  return useMutation({
    mutationFn: (data: CreateAccessEventInput) =>
      transport.post<AccessEvent>("/access-events", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-events", activeTenantId] });
    },
  });
}
