import { Injectable, NotFoundException } from "@nestjs/common";
import type { AccessEvent, UpdateAccessEventInput } from "@ramcar/shared";
import { AccessEventsRepository } from "./access-events.repository";
import type { CreateAccessEventDto } from "./dto/create-access-event.dto";

@Injectable()
export class AccessEventsService {
  constructor(private readonly repository: AccessEventsRepository) {}

  async create(
    dto: CreateAccessEventDto,
    tenantId: string,
    registeredBy: string,
  ): Promise<AccessEvent> {
    const row = await this.repository.create(dto, tenantId, registeredBy);
    return this.mapRow(row);
  }

  async findRecentByUserId(
    userId: string,
    tenantId: string,
  ): Promise<AccessEvent[]> {
    const rows = await this.repository.findRecentByUserId(userId, tenantId);
    return rows.map((row) => this.mapRow(row));
  }

  async findLastByUserId(
    userId: string,
    tenantId: string,
  ): Promise<AccessEvent | null> {
    const row = await this.repository.findLastByUserId(userId, tenantId);
    if (!row) return null;
    return this.mapRow(row);
  }

  async findRecentByVisitPersonId(
    visitPersonId: string,
    tenantId: string,
  ): Promise<AccessEvent[]> {
    const rows = await this.repository.findRecentByVisitPersonId(
      visitPersonId,
      tenantId,
    );
    return rows.map((row) => this.mapRow(row));
  }

  async update(
    id: string,
    dto: UpdateAccessEventInput,
    tenantId: string,
  ): Promise<AccessEvent> {
    const updateData: Record<string, unknown> = {};
    if (dto.direction !== undefined) updateData.direction = dto.direction;
    if (dto.accessMode !== undefined) updateData.access_mode = dto.accessMode;
    if (dto.accessMode === "pedestrian") {
      updateData.vehicle_id = null;
    } else if (dto.vehicleId !== undefined) {
      updateData.vehicle_id = dto.vehicleId;
    }
    if (dto.notes !== undefined) updateData.notes = dto.notes || null;

    const row = await this.repository.update(id, tenantId, updateData);
    if (!row) throw new NotFoundException("Access event not found");
    return this.mapRow(row);
  }

  private mapRow(row: Record<string, unknown>): AccessEvent {
    return {
      id: row.id as string,
      eventId: row.event_id as string,
      tenantId: row.tenant_id as string,
      personType: row.person_type as AccessEvent["personType"],
      userId: (row.user_id as string) ?? null,
      visitPersonId: (row.visit_person_id as string) ?? null,
      direction: row.direction as AccessEvent["direction"],
      accessMode: row.access_mode as AccessEvent["accessMode"],
      vehicleId: (row.vehicle_id as string) ?? null,
      registeredBy: row.registered_by as string,
      notes: (row.notes as string) ?? null,
      source: row.source as AccessEvent["source"],
      createdAt: row.created_at as string,
    };
  }
}
