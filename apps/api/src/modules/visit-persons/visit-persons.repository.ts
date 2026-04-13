import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../infrastructure/supabase/supabase.service";
import type { CreateVisitPersonDto } from "./dto/create-visit-person.dto";
import type { UpdateVisitPersonDto } from "./dto/update-visit-person.dto";
import type { VisitPersonFiltersDto } from "./dto/visit-person-filters.dto";

@Injectable()
export class VisitPersonsRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async create(
    dto: CreateVisitPersonDto,
    tenantId: string,
    registeredBy: string,
  ) {
    const { data, error } = await this.supabase
      .getClient()
      .from("visit_persons")
      .insert({
        tenant_id: tenantId,
        type: dto.type,
        full_name: dto.fullName,
        status: dto.status ?? "allowed",
        phone: dto.phone || null,
        company: dto.company || null,
        resident_id: dto.residentId || null,
        notes: dto.notes || null,
        registered_by: registeredBy,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findById(id: string, tenantId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from("visit_persons")
      .select()
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  }

  async list(filters: VisitPersonFiltersDto, tenantId: string) {
    let query = this.supabase
      .getClient()
      .from("visit_persons")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId);

    if (filters.type) {
      query = query.eq("type", filters.type);
    }

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.search) {
      const term = `%${filters.search}%`;
      query = query.or(
        `full_name.ilike.${term},code.ilike.${term},phone.ilike.${term},company.ilike.${term}`,
      );
    }

    const ascending = filters.sortOrder === "asc";
    query = query.order(filters.sortBy, { ascending });

    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  }

  async update(id: string, dto: UpdateVisitPersonDto, tenantId: string) {
    const updateData: Record<string, unknown> = {};
    if (dto.fullName !== undefined) updateData.full_name = dto.fullName;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.phone !== undefined) updateData.phone = dto.phone || null;
    if (dto.company !== undefined) updateData.company = dto.company || null;
    if (dto.residentId !== undefined) updateData.resident_id = dto.residentId;
    if (dto.notes !== undefined) updateData.notes = dto.notes || null;

    const { data, error } = await this.supabase
      .getClient()
      .from("visit_persons")
      .update(updateData)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
