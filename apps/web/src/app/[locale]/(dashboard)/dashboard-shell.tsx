"use client";

import { useEffect } from "react";
import { SidebarProvider, SidebarInset, TooltipProvider, LoadingScreen, Toaster } from "@ramcar/ui";
import { StoreProvider, useAppStore } from "@ramcar/store";
import type { UserProfile } from "@ramcar/shared";
import { AppSidebar } from "@/features/navigation";
import { TopBar } from "@/features/navigation/components/top-bar";
import { QueryProvider } from "@/shared/lib/query-provider";
import { WebTransportProvider, WebI18nProvider, WebRoleProvider, WebAuthStoreProvider } from "@/shared/lib/features";
import { createClient } from "@/shared/lib/supabase/client";

interface DashboardShellProps {
  children: React.ReactNode;
  userProfile: UserProfile;
}

export function DashboardShell({ children, userProfile }: DashboardShellProps) {
  return (
    <StoreProvider>
      <QueryProvider>
        <WebTransportProvider>
          <WebI18nProvider>
            <WebRoleProvider>
              <WebAuthStoreProvider>
        <AuthGate userProfile={userProfile}>
          <TooltipProvider>
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <TopBar />
                <div className="flex-1 p-4">{children}</div>
              </SidebarInset>
            </SidebarProvider>
          </TooltipProvider>
        </AuthGate>
              </WebAuthStoreProvider>
            </WebRoleProvider>
          </WebI18nProvider>
        </WebTransportProvider>
        <Toaster />
      </QueryProvider>
    </StoreProvider>
  );
}

function AuthGate({
  children,
  userProfile,
}: {
  children: React.ReactNode;
  userProfile: UserProfile;
}) {
  const isLoading = useAppStore((s) => s.isLoading);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const setUser = useAppStore((s) => s.setUser);
  const setTenantIds = useAppStore((s) => s.setTenantIds);
  const hydrateActiveTenant = useAppStore((s) => s.hydrateActiveTenant);

  useEffect(() => {
    setUser(userProfile);

    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const appMeta = session.user.app_metadata ?? {};
      const role = appMeta.role ?? userProfile.role;
      const tenantIds = appMeta.tenant_ids;

      let ids: string[] = [];
      if (role === "super_admin") {
        ids = typeof tenantIds === "string" ? [] : (Array.isArray(tenantIds) ? tenantIds : []);
      } else if (role === "resident") {
        ids = userProfile.tenantId ? [userProfile.tenantId] : [];
      } else {
        ids = Array.isArray(tenantIds) ? tenantIds : userProfile.tenantId ? [userProfile.tenantId] : [];
      }

      setTenantIds(ids);
      hydrateActiveTenant(userProfile.tenantId ?? "");
    });
  }, [userProfile, setUser, setTenantIds, hydrateActiveTenant]);

  if (isLoading || !isAuthenticated) {
    return <LoadingScreen onRetry={() => window.location.reload()} />;
  }

  return <>{children}</>;
}
