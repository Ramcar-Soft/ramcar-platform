import { useEffect } from "react";
import { useAppStore } from "@ramcar/store";
import { SidebarProvider, SidebarInset, TooltipProvider } from "@ramcar/ui";
import { AppSidebar } from "../../features/navigation";
import { TopBar } from "../../features/navigation/components/top-bar";
import { DashboardPage } from "../../features/dashboard/pages/dashboard-page";
import { AccessLogVisitorsPage } from "../../features/access-log/pages/access-log-visitors-page";
import { AccessLogProvidersPage } from "../../features/access-log/pages/access-log-providers-page";
import { AccessLogResidentsPage } from "../../features/access-log/pages/access-log-residents-page";
import { PatrolsPage } from "../../features/patrols/pages/patrols-page";
import { AccountPage } from "../../features/account/pages/account-page";

const routes: Record<string, React.ComponentType> = {
  "/dashboard": DashboardPage,
  "/access-log/visitors": AccessLogVisitorsPage,
  "/access-log/providers": AccessLogProvidersPage,
  "/access-log/residents": AccessLogResidentsPage,
  "/patrols": PatrolsPage,
  "/account": AccountPage,
};

interface PageRouterProps {
  onLogout: () => void;
}

export function PageRouter({ onLogout }: PageRouterProps) {
  const currentPath = useAppStore((s) => s.currentPath);
  const navigate = useAppStore((s) => s.navigate);

  // Redirect /access-log to /access-log/visitors
  useEffect(() => {
    if (currentPath === "/access-log") {
      navigate("/access-log/visitors");
    }
  }, [currentPath, navigate]);

  const Page = routes[currentPath] ?? DashboardPage;

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar onLogout={onLogout} />
        <SidebarInset>
          <TopBar />
          <div className="flex-1 p-4">
            <Page />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
