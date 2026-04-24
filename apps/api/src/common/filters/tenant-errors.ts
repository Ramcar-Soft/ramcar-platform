import { BadRequestException, ForbiddenException } from "@nestjs/common";

export class ActiveTenantRequiredException extends BadRequestException {
  constructor() {
    super({
      code: "ACTIVE_TENANT_REQUIRED",
      message: "X-Active-Tenant-Id header is required.",
    });
  }
}

export class TenantAccessRevokedException extends ForbiddenException {
  constructor(tenantIds?: string[]) {
    super({
      code: "TENANT_ACCESS_REVOKED",
      message: "You no longer have access to the requested tenant.",
      ...(tenantIds !== undefined ? { tenantIds } : {}),
    });
  }
}

export class CrossTenantDetailDeniedException extends ForbiddenException {
  constructor() {
    super({
      code: "CROSS_TENANT_DETAIL_DENIED",
      message: "That record is not in the current community.",
    });
  }
}
