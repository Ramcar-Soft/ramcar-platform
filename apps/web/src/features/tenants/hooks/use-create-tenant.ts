"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@ramcar/store";
import { apiClient } from "@/shared/lib/api-client";
import { createClient } from "@/shared/lib/supabase/client";
import type { CreateTenantInput, Tenant } from "../types";

export function useCreateTenant() {
  const queryClient = useQueryClient();
  const setTenantIds = useAppStore((s) => s.setTenantIds);

  return useMutation<Tenant, Error, CreateTenantInput>({
    mutationFn: (dto) => apiClient.post<Tenant>("/tenants", dto),
    onSuccess: async () => {
      // The Supabase JWT freezes `tenant_ids` at issuance via custom_access_token_hook.
      // After creating a tenant, force a refresh so the new user_tenants row is picked up —
      // otherwise the follow-up image upload and the tenants list filter would use stale ids.
      debugger;
      const supabase = createClient();
      const { data } = await supabase.auth.refreshSession();
      const nextIds = (data.session?.user.app_metadata?.tenant_ids as string[] | undefined) ?? [];
      setTenantIds(nextIds);
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}
