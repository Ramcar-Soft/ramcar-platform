import { Injectable, NotFoundException } from "@nestjs/common";
import type { VisitPerson } from "@ramcar/shared";
import { SupabaseService } from "../../infrastructure/supabase/supabase.service";
import { VisitPersonsRepository } from "./visit-persons.repository";
import type { CreateVisitPersonDto } from "./dto/create-visit-person.dto";
import type { UpdateVisitPersonDto } from "./dto/update-visit-person.dto";
import type { VisitPersonFiltersDto } from "./dto/visit-person-filters.dto";

@Injectable()
export class VisitPersonsService {
  constructor(
    private readonly repository: VisitPersonsRepository,
    private readonly supabase: SupabaseService,
  ) {}

  async create(
    dto: CreateVisitPersonDto,
    tenantId: string,
    registeredBy: string,
  ): Promise<VisitPerson> {
    const row = await this.repository.create(dto, tenantId, registeredBy);
    return this.enrichWithResidentName(this.mapRow(row));
  }

  async findById(id: string, tenantId: string): Promise<VisitPerson> {
    const row = await this.repository.findById(id, tenantId);
    if (!row) throw new NotFoundException("Visit person not found");
    return this.enrichWithResidentName(this.mapRow(row));
  }

  async list(
    filters: VisitPersonFiltersDto,
    tenantId: string,
  ): Promise<{
    data: VisitPerson[];
    meta: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    const { data, count } = await this.repository.list(filters, tenantId);
    const persons = data.map((row) => this.mapRow(row));

    const residentIds = persons
      .map((p) => p.residentId)
      .filter((id): id is string => !!id);

    const residentNameMap = await this.fetchResidentNames(residentIds);

    const enriched = persons.map((p) => ({
      ...p,
      residentName: p.residentId
        ? residentNameMap.get(p.residentId) ?? undefined
        : undefined,
    }));

    return {
      data: enriched,
      meta: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count,
        totalPages: Math.ceil(count / filters.pageSize),
      },
    };
  }

  async update(
    id: string,
    dto: UpdateVisitPersonDto,
    tenantId: string,
  ): Promise<VisitPerson> {
    const row = await this.repository.update(id, dto, tenantId);
    if (!row) throw new NotFoundException("Visit person not found");
    return this.enrichWithResidentName(this.mapRow(row));
  }

  private mapRow(row: Record<string, unknown>): VisitPerson {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      code: row.code as string,
      type: row.type as VisitPerson["type"],
      status: row.status as VisitPerson["status"],
      fullName: row.full_name as string,
      phone: (row.phone as string) ?? null,
      company: (row.company as string) ?? null,
      residentId: (row.resident_id as string) ?? null,
      notes: (row.notes as string) ?? null,
      registeredBy: row.registered_by as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private async enrichWithResidentName(person: VisitPerson): Promise<VisitPerson> {
    if (!person.residentId) return person;
    const names = await this.fetchResidentNames([person.residentId]);
    return {
      ...person,
      residentName: names.get(person.residentId) ?? undefined,
    };
  }

  private async fetchResidentNames(
    residentIds: string[],
  ): Promise<Map<string, string>> {
    if (residentIds.length === 0) return new Map();

    const uniqueIds = [...new Set(residentIds)];
    const { data } = await this.supabase
      .getClient()
      .from("profiles")
      .select("id, full_name")
      .in("id", uniqueIds);

    const map = new Map<string, string>();
    for (const row of data ?? []) {
      map.set(row.id as string, row.full_name as string);
    }
    return map;
  }
}
