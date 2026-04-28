import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Role, Vehicle } from "@ramcar/shared";
import { VehiclesRepository } from "./vehicles.repository";
import type { CreateVehicleDto } from "./dto/create-vehicle.dto";
import type { UpdateVehicleDto } from "./dto/update-vehicle.dto";
import type { TenantScope } from "../../common/utils/tenant-scope";

function scopeToTenantId(scope: TenantScope): string {
  return scope.scope === "all" ? "" : scope.tenantId;
}

@Injectable()
export class VehiclesService {
  constructor(private readonly repository: VehiclesRepository) {}

  async create(
    dto: CreateVehicleDto,
    scope: TenantScope,
    role: Role | undefined,
  ): Promise<Vehicle> {
    if (dto.ownerType === "user" && role === "guard") {
      throw new ForbiddenException("Guards cannot manage resident vehicles");
    }
    const tenantId = scopeToTenantId(scope);
    const row = await this.repository.create(dto, tenantId);
    return this.mapRow(row);
  }

  async findByUserId(userId: string, scope: TenantScope): Promise<Vehicle[]> {
    const rows = await this.repository.findByUserId(userId, scope);
    return rows.map((row) => this.mapRow(row));
  }

  async findByVisitPersonId(
    visitPersonId: string,
    scope: TenantScope,
  ): Promise<Vehicle[]> {
    const rows = await this.repository.findByVisitPersonId(visitPersonId, scope);
    return rows.map((row) => this.mapRow(row));
  }

  async update(
    id: string,
    dto: UpdateVehicleDto,
    scope: TenantScope,
    role: Role | undefined,
  ): Promise<Vehicle> {
    const existing = await this.repository.findById(id, scope);
    if (!existing) throw new NotFoundException();
    if ((existing as { user_id: string | null }).user_id !== null && role === "guard") {
      throw new ForbiddenException("Guards cannot manage resident vehicles");
    }
    const tenantId = (existing as { tenant_id: string }).tenant_id;
    const row = await this.repository.update(id, dto, tenantId);
    return this.mapRow(row);
  }

  async remove(
    id: string,
    scope: TenantScope,
    role: Role | undefined,
  ): Promise<void> {
    const existing = await this.repository.findById(id, scope);
    if (!existing) throw new NotFoundException();
    if ((existing as { user_id: string | null }).user_id !== null && role === "guard") {
      throw new ForbiddenException("Guards cannot manage resident vehicles");
    }
    const tenantId = (existing as { tenant_id: string }).tenant_id;
    const affected = await this.repository.softDelete(id, tenantId);
    if (affected === 0) throw new NotFoundException();
  }

  private mapRow(row: Record<string, unknown>): Vehicle {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      userId: (row.user_id as string) ?? null,
      visitPersonId: (row.visit_person_id as string) ?? null,
      vehicleType: row.vehicle_type as Vehicle["vehicleType"],
      brand: (row.brand as string) ?? null,
      model: (row.model as string) ?? null,
      plate: (row.plate as string) ?? null,
      color: (row.color as string) ?? null,
      notes: (row.notes as string) ?? null,
      year: (row.year as number) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}
