import { createContext, useContext, type ReactNode } from "react";

export interface AuthStorePort {
  tenantIds: string[];
  activeTenantId: string;
  activeTenantName: string;
  // Host app must include query invalidation inside this callback.
  setActiveTenant: (id: string, name: string) => void;
}

const AuthStoreContext = createContext<AuthStorePort | null>(null);

export function AuthStoreProvider({
  value,
  children,
}: {
  value: AuthStorePort;
  children: ReactNode;
}) {
  return <AuthStoreContext.Provider value={value}>{children}</AuthStoreContext.Provider>;
}

export function useAuthStore(): AuthStorePort {
  const ctx = useContext(AuthStoreContext);
  if (!ctx) throw new Error("useAuthStore must be used within an <AuthStoreProvider>");
  return ctx;
}
