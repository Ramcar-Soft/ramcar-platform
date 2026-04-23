import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { TenantScope } from "../utils/tenant-scope";

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantScope => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantScope as TenantScope;
  },
);
