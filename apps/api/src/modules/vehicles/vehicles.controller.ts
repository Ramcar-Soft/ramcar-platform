import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { Role } from "@ramcar/shared";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { CurrentUserRole } from "../../common/decorators/current-user-role.decorator";
import { VehiclesService } from "./vehicles.service";
import { createVehicleSchema } from "./dto/create-vehicle.dto";
import { updateVehicleSchema } from "./dto/update-vehicle.dto";
import type { TenantScope } from "../../common/utils/tenant-scope";

@Controller("vehicles")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles("super_admin", "admin", "guard")
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  async findByOwner(
    @Query("userId") userId?: string,
    @Query("visitPersonId") visitPersonId?: string,
    @CurrentTenant() scope?: TenantScope,
  ) {
    if (userId) {
      return this.vehiclesService.findByUserId(userId, scope!);
    }
    if (visitPersonId) {
      return this.vehiclesService.findByVisitPersonId(visitPersonId, scope!);
    }
    throw new BadRequestException("Either userId or visitPersonId is required");
  }

  @Post()
  async create(
    @Body() body: unknown,
    @CurrentTenant() scope: TenantScope,
    @CurrentUserRole() role: Role | undefined,
  ) {
    const dto = createVehicleSchema.parse(body);
    return this.vehiclesService.create(dto, scope, role);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentTenant() scope: TenantScope,
    @CurrentUserRole() role: Role | undefined,
  ) {
    const dto = updateVehicleSchema.parse(body);
    return this.vehiclesService.update(id, dto, scope, role);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(
    @Param("id") id: string,
    @CurrentTenant() scope: TenantScope,
    @CurrentUserRole() role: Role | undefined,
  ) {
    await this.vehiclesService.remove(id, scope, role);
  }
}
