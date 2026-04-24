import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "@ramcar/shared";
import { toScope, type TenantScope } from "../utils/tenant-scope";
import { SKIP_TENANT_KEY } from "../decorators/skip-tenant.decorator";
import {
  ActiveTenantRequiredException,
  TenantAccessRevokedException,
} from "../filters/tenant-errors";

const BITACORA_PATHS = ["/access-events"];

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);
  private readonly warnedUsers = new Set<string>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skipTenant = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const appMeta = request.authUser?.app_metadata ?? {};
    const role = (appMeta.role ?? "resident") as Role;
    const jwtTenantIds = appMeta.tenant_ids as "*" | string[] | undefined;

    if (jwtTenantIds === undefined && !this.warnedUsers.has(request.authUser?.id)) {
      this.logger.warn(
        { userId: request.authUser?.id },
        "legacy JWT without tenant_ids claim — awaiting refresh",
      );
      if (request.authUser?.id) this.warnedUsers.add(request.authUser.id);
    }

    if (skipTenant) {
      // Build scope from JWT without header validation (pre-boot / exempt endpoints).
      const scope: TenantScope = toScope(role, jwtTenantIds, "");
      request.tenantScope = scope;
      return true;
    }

    const activeTenantIdHeader = request.headers?.["x-active-tenant-id"] as string | undefined;
    const isBitacoraPath = BITACORA_PATHS.some((p) => request.path?.startsWith(p));

    // Bitacora exception: allow tenant_id query param as fallback if header is absent.
    const activeTenantId = activeTenantIdHeader ?? (isBitacoraPath ? request.query?.tenant_id : undefined);

    if (!activeTenantId) {
      throw new ActiveTenantRequiredException();
    }

    // Super-admin (tenant_ids === "*") has access to all tenants.
    const isSuperAdmin = role === "super_admin" || jwtTenantIds === "*";

    if (!isSuperAdmin) {
      const authorizedIds = Array.isArray(jwtTenantIds) ? jwtTenantIds : [];

      if (activeTenantId === "ALL") {
        // "ALL" sentinel is only allowed for super_admin users.
        throw new TenantAccessRevokedException(authorizedIds);
      }

      if (!authorizedIds.includes(activeTenantId)) {
        throw new TenantAccessRevokedException(authorizedIds);
      }
    }

    const scope: TenantScope = toScope(role, jwtTenantIds, activeTenantId);
    request.tenantScope = scope;
    return true;
  }
}
