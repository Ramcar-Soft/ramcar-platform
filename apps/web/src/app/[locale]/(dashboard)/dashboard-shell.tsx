"use client";

import { useEffect } from "react";
import { SidebarProvider, SidebarInset, TooltipProvider, LoadingScreen } from "@ramcar/ui";
import { StoreProvider, useAppStore } from "@ramcar/store";
import type { UserProfile } from "@ramcar/shared";
import { AppSidebar } from "@/features/navigation";
import { TopBar } from "@/features/navigation/components/top-bar";

interface DashboardShellProps {
  children: React.ReactNode;
  userProfile: UserProfile;
}

export function DashboardShell({ children, userProfile }: DashboardShellProps) {
  return (
    <StoreProvider>
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

  useEffect(() => {
    setUser(userProfile);
  }, [userProfile, setUser]);

  if (isLoading || !isAuthenticated) {
    return <LoadingScreen onRetry={() => window.location.reload()} />;
  }

  return <>{children}</>;
}
