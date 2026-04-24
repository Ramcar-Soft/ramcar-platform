"use client";

import { type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthStoreProvider, type AuthStorePort } from "@ramcar/features/tenant-selector";
import { useAppStore } from "@ramcar/store";
import { TenantSelector as SharedTenantSelector } from "@ramcar/features/tenant-selector";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function WebAuthStoreProviderInner({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const tenantIds = useAppStore((s) => s.tenantIds);
  const activeTenantId = useAppStore((s) => s.activeTenantId);
  const activeTenantName = useAppStore((s) => s.activeTenantName);
  const zustandSetActiveTenant = useAppStore((s) => s.setActiveTenant);

  const authStore: AuthStorePort = {
    tenantIds,
    activeTenantId,
    activeTenantName,
    setActiveTenant: (id, name) => {
      zustandSetActiveTenant(id, name);
      void queryClient.invalidateQueries();
    },
  };

  return <AuthStoreProvider value={authStore}>{children}</AuthStoreProvider>;
}

export function WebAuthStoreProvider({ children }: { children: ReactNode }) {
  return <WebAuthStoreProviderInner>{children}</WebAuthStoreProviderInner>;
}

export function TenantSelector() {
  return <SharedTenantSelector supabaseUrl={SUPABASE_URL} />;
}
