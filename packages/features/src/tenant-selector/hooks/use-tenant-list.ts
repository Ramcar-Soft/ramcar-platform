import { useQuery } from "@tanstack/react-query";
import type { TenantSelectorProjection } from "@ramcar/shared";
import { useTransport } from "../../adapters/transport";
import { useRole } from "../../adapters/role";

interface SelectorResponse {
  data: TenantSelectorProjection[];
  meta: { page: number; page_size: number; total: number; total_pages: number };
}

export function useTenantList() {
  const transport = useTransport();
  const { role } = useRole();
  const includeInactive = role === "SuperAdmin";

  return useQuery<TenantSelectorProjection[]>({
    queryKey: ["tenants", "selector", role],
    queryFn: async () => {
      const res = await transport.get<SelectorResponse>("/tenants", {
        params: {
          scope: "selector",
          include_inactive: String(includeInactive),
          page_size: "100",
        },
      });
      return res.data;
    },
  });
}
