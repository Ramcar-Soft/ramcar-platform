import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { Role } from "@ramcar/shared";

export type TenantScope =
  | { readonly role: "super_admin"; readonly scope: "all" }
  | { readonly role: "admin" | "guard"; readonly scope: "list"; readonly tenantIds: readonly string[] }
  | { readonly role: "resident"; readonly scope: "single"; readonly tenantId: string };

export function toScope(
  role: Role,
  tenantIds: "*" | string[] | undefined
): TenantScope {
  if (role === "super_admin" || tenantIds === "*") {
    return { role: "super_admin", scope: "all" };
  }
  if (role === "resident") {
    const id =
      (Array.isArray(tenantIds) && tenantIds[0]);
    if (!id) throw new UnauthorizedException("resident without tenant");
    return { role: "resident", scope: "single", tenantId: id };
  }
  const ids = Array.isArray(tenantIds)
    ? tenantIds
    : [];
  return { role: role as "admin" | "guard", scope: "list", tenantIds: ids };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyTenantScope<Q extends { eq: any; in: any }>(
  q: Q,
  scope: TenantScope,
  column = "tenant_id",
): Q {
  if (scope.scope === "all") return q;
  if (scope.scope === "single") return q.eq(column, scope.tenantId);
  return q.in(column, [...scope.tenantIds]);
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
