import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../infrastructure/supabase/supabase.service";
import type { CreateAccessEventDto } from "./dto/create-access-event.dto";

@Injectable()
export class AccessEventsRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async create(dto: CreateAccessEventDto, tenantId: string, registeredBy: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from("access_events")
      .insert({
        tenant_id: tenantId,
        event_id: dto.eventId || undefined,
        person_type: dto.personType,
        user_id: dto.userId || null,
        visit_person_id: dto.visitPersonId || null,
        direction: dto.direction,
        access_mode: dto.accessMode,
        vehicle_id: dto.vehicleId || null,
        registered_by: registeredBy,
        notes: dto.notes || null,
        source: dto.source,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findRecentByUserId(userId: string, tenantId: string, limit = 3) {
    const { data, error } = await this.supabase
      .getClient()
      .from("access_events")
      .select()
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .eq("person_type", "resident")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  async findLastByUserId(userId: string, tenantId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from("access_events")
      .select()
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .eq("person_type", "resident")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async findRecentByVisitPersonId(
    visitPersonId: string,
    tenantId: string,
    limit = 3,
  ) {
    const { data, error } = await this.supabase
      .getClient()
      .from("access_events")
      .select()
      .eq("tenant_id", tenantId)
      .eq("visit_person_id", visitPersonId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  async update(
    id: string,
    tenantId: string,
    updateData: Record<string, unknown>,
  ) {
    const { data, error } = await this.supabase
      .getClient()
      .from("access_events")
      .update(updateData)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
