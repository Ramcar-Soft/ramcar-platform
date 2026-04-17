import { createContext, useContext, type ReactNode } from "react";

export type Role = "SuperAdmin" | "Admin" | "Guard" | "Resident";

export interface RolePort {
  role: Role;
  tenantId: string;
  userId: string;
}

const RoleContext = createContext<RolePort | null>(null);

export function RoleProvider({
  value,
  children,
}: {
  value: RolePort;
  children: ReactNode;
}) {
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RolePort {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within a <RoleProvider>");
  return ctx;
}
