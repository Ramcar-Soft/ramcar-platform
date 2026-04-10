import { Injectable } from "@nestjs/common";
import type {
  ExtendedUserProfile,
  PaginatedResponse,
  Vehicle,
} from "@ramcar/shared";
import { UsersService } from "../users/users.service";
import { VehiclesService } from "../vehicles/vehicles.service";
import type { ResidentFiltersDto } from "./dto/resident-filters.dto";

interface AuthUser {
  id: string;
  app_metadata?: {
    role?: string;
    tenant_id?: string;
  };
}

@Injectable()
export class ResidentsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  async list(
    filters: ResidentFiltersDto,
    actorUser: AuthUser,
    tenantId: string,
  ): Promise<PaginatedResponse<ExtendedUserProfile>> {
    return this.usersService.list(
      {
        ...filters,
        role: "resident",
        status: filters.status ?? "active",
      },
      actorUser,
      tenantId,
    );
  }

  async getVehicles(
    residentId: string,
    tenantId: string,
  ): Promise<Vehicle[]> {
    return this.vehiclesService.findByUserId(residentId, tenantId);
  }
}
