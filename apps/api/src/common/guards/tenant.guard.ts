import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tenantId: string | undefined = request.authUser?.app_metadata?.tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException("No tenant associated with this user");
    }

    request.tenantId = tenantId;
    return true;
  }
}
