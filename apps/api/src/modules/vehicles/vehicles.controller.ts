import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { VehiclesService } from "./vehicles.service";
import { createVehicleSchema } from "./dto/create-vehicle.dto";
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
  ) {
    const dto = createVehicleSchema.parse(body);
    return this.vehiclesService.create(dto, scope);
  }
}
