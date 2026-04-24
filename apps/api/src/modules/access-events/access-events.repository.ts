import { Injectable } from "@nestjs/common";
import type { AccessEventListItem, VisitPersonStatus } from "@ramcar/shared";
import { SupabaseService } from "../../infrastructure/supabase/supabase.service";
import type { CreateAccessEventDto } from "./dto/create-access-event.dto";
import type { TenantScope } from "../../common/utils/tenant-scope";

export interface ListAccessEventsFilters {
  personType: string;
  page: number;
  pageSize: number;
  dateFromUTC: string;
  dateToUTC: string;
  residentId?: string;
  search?: string;
}

export type { TenantScope as ListAccessEventsScope };

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

  async findRecentByUserId(userId: string, scope: TenantScope, limit = 3) {
    const tenantId = scope.scope === "all" ? "" : scope.tenantId;
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

  async findLastByUserId(userId: string, scope: TenantScope) {
    const tenantId = scope.scope === "all" ? "" : scope.tenantId;
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
    scope: TenantScope,
    limit = 3,
  ) {
    const tenantId = scope.scope === "all" ? "" : scope.tenantId;
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
    scope: TenantScope,
    updateData: Record<string, unknown>,
  ) {
    const tenantId = scope.scope === "all" ? "" : scope.tenantId;
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

  /**
   * List access events for the Logbook. Joins visit_persons (for visitor/provider
   * rows), profiles (resident and guard), vehicles, and tenants.
   *
   * PostgREST relationship hints are used with foreign-key-named disambiguation
   * to tell it which `profiles` join to use for each alias. FK constraints in
   * Postgres are auto-named as `<table>_<column>_fkey` unless explicitly named.
   */
  async list(
    filters: ListAccessEventsFilters,
    scope: TenantScope,
  ): Promise<{ data: AccessEventListItem[]; total: number }> {
    const client = this.supabase.getClient();
    const { personType, page, pageSize, dateFromUTC, dateToUTC, residentId } =
      filters;

    const selectExpr = `
      id, tenant_id, person_type, direction, access_mode, notes, created_at,
      visit_person_id, user_id, vehicle_id, registered_by,
      visit_person:visit_persons(
        id, code, full_name, phone, company, status, resident_id,
        resident:profiles!visit_persons_resident_id_fkey(id, full_name)
      ),
      resident:profiles!access_events_user_id_fkey(id, full_name, address),
      vehicle:vehicles(id, plate, brand, model),
      guard:profiles!access_events_registered_by_fkey(id, full_name),
      tenant:tenants(id, name)
    `.replace(/\s+/g, " ");

    let query = client
      .from("access_events")
      .select(selectExpr, { count: "exact" })
      .eq("person_type", personType)
      .gte("created_at", dateFromUTC)
      .lte("created_at", dateToUTC);

    if (scope.scope === "all") {
      // super_admin: no tenant filter
    } else if (scope.tenantId) {
      query = query.eq("tenant_id", scope.tenantId);
    } else {
      return { data: [], total: 0 };
    }

    if (residentId) {
      if (personType === "resident") {
        query = query.eq("user_id", residentId);
      } else {
        // Filter visitor/provider rows by the resident they are visiting.
        // Cannot use a nested .eq() on embedded select directly; use a subquery-like filter.
        // PostgREST supports filtering by embedded fields via `visit_person.resident_id`.
        query = query.eq("visit_person.resident_id", residentId);
      }
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query
      .order("created_at", { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    return {
      data: rows.map((row) => this.mapListRow(row)),
      total: count ?? 0,
    };
  }

  /**
   * Async generator that yields batches of access-event rows for CSV export.
   * Delegates to `searchList` when a search term is present, otherwise to
   * `list`. Pagination state is computed from `offset / batchSize` so the
   * existing 1-based page contract is respected.
   *
   * The generator terminates when the last batch returns fewer rows than
   * `batchSize` (covers the exact-multiple edge case on the next iteration).
   */
  async *exportIterator(
    filters: Omit<ListAccessEventsFilters, "page" | "pageSize"> & {
      search?: string;
    },
    scope: TenantScope,
    batchSize = 500,
  ): AsyncGenerator<AccessEventListItem[]> {
    let offset = 0;
    while (true) {
      const page = Math.floor(offset / batchSize) + 1;
      let batch: AccessEventListItem[];

      if (filters.search) {
        const result = await this.searchList(
          {
            ...filters,
            page,
            pageSize: batchSize,
            search: filters.search,
          },
          scope,
        );
        batch = result.data;
      } else {
        const result = await this.list(
          {
            ...filters,
            page,
            pageSize: batchSize,
          },
          scope,
        );
        batch = result.data;
      }

      if (batch.length > 0) {
        yield batch;
      }
      offset += batch.length;
      if (batch.length < batchSize) break;
    }
  }

  async searchList(
    filters: ListAccessEventsFilters & { search: string },
    scope: TenantScope,
  ): Promise<{ data: AccessEventListItem[]; total: number }> {
    const tenantIds = scope.scope === "all" ? [] : [scope.tenantId];
    const offset = (filters.page - 1) * filters.pageSize;

    const { data, error } = await this.supabase
      .getClient()
      .rpc("search_access_events", {
        p_tenant_ids: tenantIds,
        p_person_type: filters.personType,
        p_date_from: filters.dateFromUTC,
        p_date_to_exclusive: filters.dateToUTC,
        p_resident_id: filters.residentId ?? null,
        p_search: filters.search,
        p_limit: filters.pageSize,
        p_offset: offset,
      });

    if (error) throw error;
    if (!data || data.length === 0) return { data: [], total: 0 };

    const total = Number(data[0].total_count);
    const items = (data as Record<string, unknown>[]).map((row) =>
      this.mapRpcRow(row),
    );
    return { data: items, total };
  }

  private mapRpcRow(row: Record<string, unknown>): AccessEventListItem {
    const visitPersonId = row.visit_person_id as string | null;
    const userId = row.user_id as string | null;

    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      tenantName: (row.tenant_name as string) ?? null,
      personType: row.person_type as AccessEventListItem["personType"],
      direction: row.direction as AccessEventListItem["direction"],
      accessMode: row.access_mode as AccessEventListItem["accessMode"],
      notes: (row.notes as string) ?? null,
      createdAt: row.created_at as string,
      visitPerson: visitPersonId
        ? {
            id: visitPersonId,
            code: (row.vp_code as string) ?? "",
            fullName: (row.vp_full_name as string) ?? "",
            phone: (row.vp_phone as string) ?? null,
            company: (row.vp_company as string) ?? null,
            status: (row.vp_status as VisitPersonStatus) ?? "allowed",
            residentId: (row.vp_resident_id as string) ?? null,
            residentFullName: (row.vp_resident_full_name as string) ?? null,
          }
        : null,
      resident: userId
        ? {
            id: userId,
            fullName: (row.res_full_name as string) ?? "",
            unit: (row.res_address as string) ?? null,
          }
        : null,
      vehicle: row.vehicle_id
        ? {
            id: row.vehicle_id as string,
            plate: (row.vehicle_plate as string) ?? null,
            brand: (row.vehicle_brand as string) ?? null,
            model: (row.vehicle_model as string) ?? null,
          }
        : null,
      registeredBy: {
        id: row.registered_by as string,
        fullName: (row.guard_full_name as string) ?? "",
      },
    };
  }

  private mapListRow(row: Record<string, unknown>): AccessEventListItem {
    const visitPerson = row.visit_person as
      | {
          id: string;
          code: string;
          full_name: string;
          phone: string | null;
          company: string | null;
          status: string;
          resident_id: string | null;
          resident?: { id: string; full_name: string } | null;
        }
      | null
      | undefined;
    const resident = row.resident as
      | { id: string; full_name: string; address: string | null }
      | null
      | undefined;
    const vehicle = row.vehicle as
      | {
          id: string;
          plate: string | null;
          brand: string | null;
          model: string | null;
        }
      | null
      | undefined;
    const guard = row.guard as
      | { id: string; full_name: string }
      | null
      | undefined;
    const tenant = row.tenant as
      | { id: string; name: string }
      | null
      | undefined;

    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      tenantName: tenant?.name ?? null,
      personType: row.person_type as AccessEventListItem["personType"],
      direction: row.direction as AccessEventListItem["direction"],
      accessMode: row.access_mode as AccessEventListItem["accessMode"],
      notes: (row.notes as string) ?? null,
      createdAt: row.created_at as string,
      visitPerson: visitPerson
        ? {
            id: visitPerson.id,
            code: visitPerson.code,
            fullName: visitPerson.full_name,
            phone: visitPerson.phone ?? null,
            company: visitPerson.company ?? null,
            status: visitPerson.status as VisitPersonStatus,
            residentId: visitPerson.resident_id ?? null,
            residentFullName: visitPerson.resident?.full_name ?? null,
          }
        : null,
      resident: resident
        ? {
            id: resident.id,
            fullName: resident.full_name,
            unit: resident.address ?? null,
          }
        : null,
      vehicle: vehicle
        ? {
            id: vehicle.id,
            plate: vehicle.plate ?? null,
            brand: vehicle.brand ?? null,
            model: vehicle.model ?? null,
          }
        : null,
      registeredBy: {
        id: guard?.id ?? (row.registered_by as string),
        fullName: guard?.full_name ?? "",
      },
    };
  }
}
