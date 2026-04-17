"use client";

import { useEffect, useState, type ReactNode } from "react";
import { RoleProvider, type RolePort, type Role } from "@ramcar/features/adapters";
import { createClient } from "@/shared/lib/supabase/client";
import type { Role as SharedRole } from "@ramcar/shared";

function mapRole(role: SharedRole): Role {
  const map: Record<SharedRole, Role> = {
    super_admin: "SuperAdmin",
    admin: "Admin",
    guard: "Guard",
    resident: "Resident",
  };
  return map[role] ?? "Resident";
}

const fallback: RolePort = { role: "Resident", tenantId: "", userId: "" };

export function WebRoleProvider({ children }: { children: ReactNode }) {
  const [rolePort, setRolePort] = useState<RolePort>(fallback);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const meta = session.user.app_metadata;
      setRolePort({
        role: mapRole((meta.role as SharedRole) ?? "resident"),
        tenantId: (meta.tenant_id as string) ?? "",
        userId: session.user.id,
      });
    });
  }, []);

  return <RoleProvider value={rolePort}>{children}</RoleProvider>;
}
