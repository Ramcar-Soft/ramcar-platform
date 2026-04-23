import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../infrastructure/supabase/supabase.service";
import type { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { applyTenantScope, type TenantScope } from "../../common/utils/tenant-scope";

@Injectable()
export class VehiclesRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async create(dto: CreateVehicleDto, tenantId: string) {
    const ownerFields =
      dto.ownerType === "user"
        ? { user_id: dto.userId, visit_person_id: null }
        : { user_id: null, visit_person_id: dto.visitPersonId };

    const { data, error } = await this.supabase
      .getClient()
      .from("vehicles")
      .insert({
        tenant_id: tenantId,
        ...ownerFields,
        vehicle_type: dto.vehicleType,
        brand: dto.brand || null,
        model: dto.model || null,
        plate: dto.plate || null,
        color: dto.color || null,
        notes: dto.notes || null,
        year: dto.year ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findByUserId(userId: string, scope: TenantScope) {
    let query = this.supabase
      .getClient()
      .from("vehicles")
      .select()
      .eq("user_id", userId)
      .eq("is_blacklisted", false)
      .order("created_at", { ascending: false });

    query = applyTenantScope(query, scope) as typeof query;
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async findByVisitPersonId(visitPersonId: string, scope: TenantScope) {
    let query = this.supabase
      .getClient()
      .from("vehicles")
      .select()
      .eq("visit_person_id", visitPersonId)
      .eq("is_blacklisted", false)
      .order("created_at", { ascending: false });

    query = applyTenantScope(query, scope) as typeof query;
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }
}
