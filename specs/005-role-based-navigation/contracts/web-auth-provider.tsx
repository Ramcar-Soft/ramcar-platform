/**
 * Contract: Web Auth Provider Pattern
 *
 * Defines how the web app's DashboardShell integrates StoreProvider
 * and hydrates auth state from server-side data.
 */

import type { ReactNode } from "react";
import type { UserProfile } from "@ramcar/shared";

// ---------------------------------------------------------------------------
// DashboardShell — apps/web/src/app/[locale]/(dashboard)/dashboard-shell.tsx
// ---------------------------------------------------------------------------

interface DashboardShellProps {
  children: ReactNode;
  /**
   * UserProfile extracted server-side from Supabase auth metadata.
   * Passed from the dashboard layout (server component) to this client component.
   */
  userProfile: UserProfile;
}

/**
 * Updated DashboardShell wraps the app in StoreProvider and gates
 * rendering on auth state hydration.
 *
 * Render tree:
 *   <StoreProvider>
 *     <AuthGate userProfile={userProfile}>
 *       <TooltipProvider>
 *         <SidebarProvider>
 *           <AppSidebar />
 *           <SidebarInset>
 *             <TopBar />
 *             <div className="flex-1 p-4">{children}</div>
 *           </SidebarInset>
 *         </SidebarProvider>
 *       </TooltipProvider>
 *     </AuthGate>
 *   </StoreProvider>
 */
export declare function DashboardShell(props: DashboardShellProps): JSX.Element;

// ---------------------------------------------------------------------------
// AuthGate — internal component within dashboard-shell.tsx
// ---------------------------------------------------------------------------

interface AuthGateProps {
  children: ReactNode;
  userProfile: UserProfile;
}

/**
 * Internal component that:
 * 1. On mount, calls setUser(userProfile) to hydrate the Zustand auth slice
 * 2. While isLoading is true, renders <LoadingScreen />
 * 3. Once hydrated (isLoading false, isAuthenticated true), renders children
 *
 * This ensures all child components can safely read user data from the store.
 */
declare function AuthGate(props: AuthGateProps): JSX.Element;

// ---------------------------------------------------------------------------
// Dashboard Layout — apps/web/src/app/[locale]/(dashboard)/layout.tsx
// ---------------------------------------------------------------------------

/**
 * Updated server component that:
 * 1. Fetches user via supabase.auth.getUser()
 * 2. If no user → redirect to /login (existing behavior)
 * 3. Calls extractUserProfile(user) to get UserProfile
 * 4. Renders <DashboardShell userProfile={userProfile}>{children}</DashboardShell>
 */
// Server component — no export declaration, just documentation of pattern
