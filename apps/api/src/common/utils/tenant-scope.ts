import { ForbiddenException } from "@nestjs/common";
import type { Role } from "@ramcar/shared";

export type TenantScope =
  | { readonly role: "super_admin"; readonly scope: "all"; readonly tenantId: string; readonly tenantIds: readonly string[] }
  | { readonly role: "admin" | "guard"; readonly scope: "list"; readonly tenantId: string; readonly tenantIds: readonly string[] }
  | { readonly role: "resident"; readonly scope: "single"; readonly tenantId: string; readonly tenantIds: readonly string[] };

export function toScope(
  role: Role,
  tenantIds: "*" | string[] | undefined,
  activeTenantId = "",
): TenantScope {
  if (role === "super_admin" || tenantIds === "*") {
    return { role: "super_admin", scope: "all", tenantId: activeTenantId, tenantIds: [] };
  }
  const ids = Array.isArray(tenantIds) ? tenantIds : [];
  if (role === "resident") {
    const id = activeTenantId || ids[0] || "";
    return { role: "resident", scope: "single", tenantId: id, tenantIds: ids };
  }
  return { role: role as "admin" | "guard", scope: "list", tenantId: activeTenantId || ids[0] || "", tenantIds: ids };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyTenantScope<Q extends { eq: any; in: any }>(
  q: Q,
  scope: TenantScope,
  column = "tenant_id",
): Q {
  if (scope.scope === "all") return q;
  return q.eq(column, scope.tenantId);
}

export function assertTargetAllowed(
  scope: TenantScope,
  targetTenantId: string,
): void {
  if (scope.scope === "all") return;
  if (scope.scope === "single" && scope.tenantId === targetTenantId) return;
  if (scope.scope === "list" && scope.tenantIds.includes(targetTenantId)) return;
  throw new ForbiddenException();
}
