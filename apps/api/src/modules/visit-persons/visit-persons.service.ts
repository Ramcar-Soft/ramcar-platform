import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Role, VisitPerson } from "@ramcar/shared";
import { SupabaseService } from "../../infrastructure/supabase/supabase.service";
import { VisitPersonsRepository } from "./visit-persons.repository";
import type { CreateVisitPersonDto } from "./dto/create-visit-person.dto";
import type { UpdateVisitPersonDto } from "./dto/update-visit-person.dto";
import type { VisitPersonFiltersDto } from "./dto/visit-person-filters.dto";
import type { TenantScope } from "../../common/utils/tenant-scope";

function scopeToTenantId(scope: TenantScope): string {
  return scope.scope === "all" ? "" : scope.tenantId;
}

@Injectable()
export class VisitPersonsService {
  constructor(
    private readonly repository: VisitPersonsRepository,
    private readonly supabase: SupabaseService,
  ) {}

  async create(
    dto: CreateVisitPersonDto,
    scope: TenantScope,
    registeredBy: string,
    role: Role | undefined,
  ): Promise<VisitPerson> {
    const tenantId = scopeToTenantId(scope);
    const safeDto: CreateVisitPersonDto =
      role === "admin" || role === "super_admin" ? dto : { ...dto, status: "flagged" };
    const row = await this.repository.create(safeDto, tenantId, registeredBy);
    return this.enrichWithResidentDisplay(this.mapRow(row));
  }

  async findById(id: string, scope: TenantScope): Promise<VisitPerson> {
    const row = await this.repository.findById(id, scope);
    if (!row) throw new NotFoundException("Visit person not found");
    return this.enrichWithResidentDisplay(this.mapRow(row));
  }

  async list(
    filters: VisitPersonFiltersDto,
    scope: TenantScope,
  ): Promise<{
    data: VisitPerson[];
    meta: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    const { data, count } = await this.repository.list(filters, scope);
    const persons = data.map((row) => this.mapRow(row));

    const residentIds = persons
      .map((p) => p.residentId)
      .filter((id): id is string => !!id);

    const residentInfoMap = await this.fetchResidentDisplayInfo(residentIds);

    const enriched = persons.map((p) => {
      if (!p.residentId) return p;
      const info = residentInfoMap.get(p.residentId);
      return {
        ...p,
        residentName: info?.fullName,
        residentAddress: info?.address ?? null,
      };
    });

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
    scope: TenantScope,
    role: Role | undefined,
  ): Promise<VisitPerson> {
    if (role !== "admin" && role !== "super_admin" && dto.status !== undefined) {
      throw new ForbiddenException("Guards cannot change visit-person status");
    }
    const row = await this.repository.update(id, dto, scope);
    if (!row) throw new NotFoundException("Visit person not found");
    return this.enrichWithResidentDisplay(this.mapRow(row));
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

  private async enrichWithResidentDisplay(person: VisitPerson): Promise<VisitPerson> {
    if (!person.residentId) return person;
    const info = await this.fetchResidentDisplayInfo([person.residentId]);
    const entry = info.get(person.residentId);
    return {
      ...person,
      residentName: entry?.fullName,
      residentAddress: entry?.address ?? null,
    };
  }

  private async fetchResidentDisplayInfo(
    residentIds: string[],
  ): Promise<Map<string, { fullName: string; address: string | null }>> {
    if (residentIds.length === 0) return new Map();

    const uniqueIds = [...new Set(residentIds)];
    const { data } = await this.supabase
      .getClient()
      .from("profiles")
      .select("id, full_name, address")
      .in("id", uniqueIds);

    const map = new Map<string, { fullName: string; address: string | null }>();
    for (const row of data ?? []) {
      map.set(row.id as string, {
        fullName: row.full_name as string,
        address: (row.address as string | null) ?? null,
      });
    }
    return map;
  }
}
