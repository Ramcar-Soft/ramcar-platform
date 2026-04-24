import { useEffect } from "react";
import { useAppStore } from "@ramcar/store";
import { isRouteAllowedForRole } from "@ramcar/shared";
import { SidebarProvider, SidebarInset, TooltipProvider, Toaster } from "@ramcar/ui";
import { AppSidebar } from "../../features/navigation";
import { TopBar } from "../../features/navigation/components/top-bar";
import { QueryProvider } from "../lib/query-provider";
import { DesktopTransportProvider, DesktopI18nProvider, DesktopRoleProvider, DesktopAuthStoreProvider } from "../lib/features";
import { useUpdateNotifier } from "../hooks/use-update-notifier";
import { DashboardPage } from "../../features/dashboard/pages/dashboard-page";
import { AccessLogVisitorsPage } from "../../features/access-log/pages/access-log-visitors-page";
import { AccessLogProvidersPage } from "../../features/access-log/pages/access-log-providers-page";
import { AccessLogResidentsPage } from "../../features/access-log/pages/access-log-residents-page";
import { PatrolsPage } from "../../features/patrols/pages/patrols-page";
import { AccountPage } from "../../features/account/pages/account-page";
import { ResidentsPage } from "../../features/residents/pages/residents-page";
import { VisitorsPage } from "../../pages/visitors-page";
import { ProvidersPage } from "../../features/providers/pages/providers-page";

const routes: Record<string, React.ComponentType> = {
  "/dashboard": DashboardPage,
  "/visits-and-residents/residents": ResidentsPage,
  "/visits-and-residents/visitors": VisitorsPage,
  "/visits-and-residents/providers": ProvidersPage,
  "/access-log/visitors": AccessLogVisitorsPage,
  "/access-log/providers": AccessLogProvidersPage,
  "/access-log/residents": AccessLogResidentsPage,
  "/patrols": PatrolsPage,
  "/account": AccountPage,
};

function UpdateNotifier() {
  useUpdateNotifier();
  return null;
}

interface PageRouterProps {
  onLogout: () => void;
}

export function PageRouter({ onLogout }: PageRouterProps) {
  const currentPath = useAppStore((s) => s.currentPath);
  const navigate = useAppStore((s) => s.navigate);
  const user = useAppStore((s) => s.user);

  // Redirect parent routes to first sub-item
  useEffect(() => {
    if (currentPath === "/access-log") {
      navigate("/access-log/visitors");
    }
    if (currentPath === "/visits-and-residents") {
      navigate("/visits-and-residents/visitors");
    }
  }, [currentPath, navigate]);

  // Role-based route guard
  useEffect(() => {
    if (user && !isRouteAllowedForRole(currentPath, user.role, "desktop")) {
      navigate("/dashboard");
    }
  }, [currentPath, user, navigate]);

  const isAllowed = user ? isRouteAllowedForRole(currentPath, user.role, "desktop") : true;
  const Page = isAllowed ? (routes[currentPath] ?? DashboardPage) : DashboardPage;

  return (
    <QueryProvider>
      <DesktopTransportProvider>
        <DesktopI18nProvider>
          <DesktopRoleProvider>
            <DesktopAuthStoreProvider>
      <UpdateNotifier />
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
      <Toaster />
            </DesktopAuthStoreProvider>
          </DesktopRoleProvider>
        </DesktopI18nProvider>
      </DesktopTransportProvider>
    </QueryProvider>
  );
}
