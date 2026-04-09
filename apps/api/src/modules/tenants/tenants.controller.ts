import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { TenantsService } from "./tenants.service";

@Controller("tenants")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles("super_admin", "admin")
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: unknown,
    @CurrentTenant() tenantId: string,
  ) {
    const data = await this.tenantsService.findAll(
      user as { id: string; app_metadata?: { role?: string; tenant_id?: string } },
      tenantId,
    );
    return { data };
  }
}
