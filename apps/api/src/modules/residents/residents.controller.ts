import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { ResidentsService } from "./residents.service";
import { residentFiltersSchema } from "./dto/resident-filters.dto";

@Controller("residents")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles("super_admin", "admin", "guard")
export class ResidentsController {
  constructor(private readonly residentsService: ResidentsService) {}

  @Get()
  async list(
    @Query() query: Record<string, string>,
    @CurrentUser() user: unknown,
    @CurrentTenant() tenantId: string,
  ) {
    const filters = residentFiltersSchema.parse(query);
    return this.residentsService.list(
      filters,
      user as { id: string; app_metadata?: { role?: string; tenant_id?: string } },
      tenantId,
    );
  }

  @Get(":id")
  async getById(
    @Param("id") id: string,
    @CurrentUser() user: unknown,
    @CurrentTenant() tenantId: string,
  ) {
    return this.residentsService.getById(
      id,
      user as { id: string; app_metadata?: { role?: string; tenant_id?: string } },
      tenantId,
    );
  }

  @Get(":id/vehicles")
  async getVehicles(
    @Param("id") id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.residentsService.getVehicles(id, tenantId);
  }
}
