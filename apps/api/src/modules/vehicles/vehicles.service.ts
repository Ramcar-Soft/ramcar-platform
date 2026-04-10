import { Injectable } from "@nestjs/common";
import type { Vehicle } from "@ramcar/shared";
import { VehiclesRepository } from "./vehicles.repository";
import type { CreateVehicleDto } from "./dto/create-vehicle.dto";

@Injectable()
export class VehiclesService {
  constructor(private readonly repository: VehiclesRepository) {}

  async create(
    dto: CreateVehicleDto,
    tenantId: string,
  ): Promise<Vehicle> {
    const row = await this.repository.create(dto, tenantId);
    return this.mapRow(row);
  }

  async findByUserId(
    userId: string,
    tenantId: string,
  ): Promise<Vehicle[]> {
    const rows = await this.repository.findByUserId(userId, tenantId);
    return rows.map((row) => this.mapRow(row));
  }

  private mapRow(row: Record<string, unknown>): Vehicle {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      userId: row.user_id as string,
      vehicleType: row.vehicle_type as Vehicle["vehicleType"],
      brand: (row.brand as string) ?? null,
      model: (row.model as string) ?? null,
      plate: (row.plate as string) ?? null,
      color: (row.color as string) ?? null,
      notes: (row.notes as string) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}
