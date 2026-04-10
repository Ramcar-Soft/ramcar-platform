import {
  Body,
  Controller,
  UseGuards,
  Post,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { VehiclesService } from "./vehicles.service";
import { createVehicleSchema } from "./dto/create-vehicle.dto";

@Controller("vehicles")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles("super_admin", "admin", "guard")
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  async create(
    @Body() body: unknown,
    @CurrentTenant() tenantId: string,
  ) {
    const dto = createVehicleSchema.parse(body);
    return this.vehiclesService.create(dto, tenantId);
  }
}
