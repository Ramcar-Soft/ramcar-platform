import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Role } from "@ramcar/shared";

export const CurrentUserRole = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Role | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.authUser?.app_metadata?.role as Role | undefined;
  },
);
