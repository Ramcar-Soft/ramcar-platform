import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AccessEvent, CreateAccessEventInput } from "@ramcar/shared";
import { useTransport, useRole } from "../../adapters";

export function useCreateAccessEvent() {
  const queryClient = useQueryClient();
  const transport = useTransport();
  const { tenantId } = useRole();

  return useMutation({
    mutationFn: (data: CreateAccessEventInput) =>
      transport.post<AccessEvent>("/access-events", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-events", tenantId] });
    },
  });
}
