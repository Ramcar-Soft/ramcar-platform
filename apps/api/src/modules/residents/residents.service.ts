import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  ExtendedUserProfile,
  PaginatedResponse,
  Vehicle,
} from "@ramcar/shared";
import { UsersService } from "../users/users.service";
import { VehiclesService } from "../vehicles/vehicles.service";
import type { ResidentFiltersDto } from "./dto/resident-filters.dto";
import type { TenantScope } from "../../common/utils/tenant-scope";

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
    scope: TenantScope,
  ): Promise<PaginatedResponse<ExtendedUserProfile>> {
    return this.usersService.list(
      {
        ...filters,
        role: "resident",
        status: filters.status ?? "active",
      },
      actorUser,
      scope,
    );
  }

  async getById(
    id: string,
    actorUser: AuthUser,
    scope: TenantScope,
  ): Promise<ExtendedUserProfile> {
    const profile = await this.usersService.getById(id, actorUser, scope);
    if (profile.role !== "resident") {
      throw new NotFoundException("Resident not found");
    }
    return profile;
  }

  async getVehicles(
    residentId: string,
    scope: TenantScope,
  ): Promise<Vehicle[]> {
    return this.vehiclesService.findByUserId(residentId, scope);
  }
}
