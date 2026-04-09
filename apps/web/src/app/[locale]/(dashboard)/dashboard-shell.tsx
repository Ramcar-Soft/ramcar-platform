"use client";

import { SidebarProvider, SidebarInset, TooltipProvider } from "@ramcar/ui";
import { AppSidebar } from "@/features/navigation";
import { TopBar } from "@/features/navigation/components/top-bar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <TopBar />
          <div className="flex-1 p-4">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
