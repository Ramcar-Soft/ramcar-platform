import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../infrastructure/supabase/supabase.service";
import type { CreateVehicleDto } from "./dto/create-vehicle.dto";
import type { UpdateVehicleDto } from "./dto/update-vehicle.dto";
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

  async findById(id: string, scope: TenantScope) {
    let query = this.supabase
      .getClient()
      .from("vehicles")
      .select()
      .eq("id", id)
      .is("deleted_at", null)
      .limit(1);

    query = applyTenantScope(query, scope) as typeof query;
    const { data, error } = await query;
    if (error) throw error;
    return data?.[0] ?? null;
  }

  async findByUserId(userId: string, scope: TenantScope) {
    let query = this.supabase
      .getClient()
      .from("vehicles")
      .select()
      .eq("user_id", userId)
      .eq("is_blacklisted", false)
      .is("deleted_at", null)
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
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    query = applyTenantScope(query, scope) as typeof query;
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async update(id: string, dto: UpdateVehicleDto, tenantId: string) {
    const patch: Record<string, unknown> = {};
    if (dto.vehicleType !== undefined) patch.vehicle_type = dto.vehicleType;
    if (dto.brand !== undefined) patch.brand = dto.brand || null;
    if (dto.model !== undefined) patch.model = dto.model || null;
    if (dto.plate !== undefined) patch.plate = dto.plate || null;
    if (dto.color !== undefined) patch.color = dto.color || null;
    if (dto.notes !== undefined) patch.notes = dto.notes || null;
    if (dto.year !== undefined) patch.year = dto.year ?? null;

    const { data, error } = await this.supabase
      .getClient()
      .from("vehicles")
      .update(patch)
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async softDelete(id: string, tenantId: string): Promise<number> {
    const { count, error } = await this.supabase
      .getClient()
      .from("vehicles")
      .update({ deleted_at: new Date().toISOString() }, { count: "exact" })
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .is("deleted_at", null);

    if (error) throw error;
    return count ?? 0;
  }
}
