import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from "@nestjs/common";
import type { Role } from "@ramcar/shared";
import {
  toScope,
  assertTargetAllowed,
  type TenantScope,
} from "../utils/tenant-scope";

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);
  private readonly warnedUsers = new Set<string>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const appMeta = request.authUser?.app_metadata ?? {};

    const role = (appMeta.role ?? "resident") as Role;
    const tenantIds = appMeta.tenant_ids as "*" | string[] | undefined;

    if (tenantIds === undefined && !this.warnedUsers.has(request.authUser?.id)) {
      this.logger.warn(
        { userId: request.authUser?.id },
        "legacy JWT without tenant_ids claim — awaiting refresh",
      );
      if (request.authUser?.id) this.warnedUsers.add(request.authUser.id);
    }

    const scope: TenantScope = toScope(role, tenantIds);
    request.tenantScope = scope;

    const targetTenantId =
      request.params?.id ??
      request.params?.tenantId ??
      request.query?.tenant_id ??
      request.body?.tenant_id ??
      (Array.isArray(request.body?.tenant_ids) ? undefined : undefined);

    if (targetTenantId) {
      assertTargetAllowed(scope, targetTenantId as string);
    }

    return true;
  }
}
