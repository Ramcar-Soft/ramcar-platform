import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from "@nestjs/common";
import { Readable } from "node:stream";
import type {
  AccessEvent,
  AccessEventExportQueryInput,
  AccessEventListQueryInput,
  AccessEventListResponse,
  LogbookLocale,
  Role,
  UpdateAccessEventInput,
} from "@ramcar/shared";
import { TenantsService } from "../tenants/tenants.service";
import {
  AccessEventsRepository,
  type ListAccessEventsScope,
} from "./access-events.repository";
import { CSV_BOM, getHeaderRow, itemToRow } from "./access-events.csv";
import type { CreateAccessEventDto } from "./dto/create-access-event.dto";

interface AuthActor {
  id: string;
  app_metadata?: {
    role?: string;
    tenant_id?: string;
  };
}

export function resolveTenantScope(
  actorRole: Role,
  actorTenantId: string,
  requestedTenantId: string | undefined,
  authorizedTenantIds: string[],
): ListAccessEventsScope {
  if (actorRole === "admin") {
    if (!requestedTenantId || requestedTenantId === actorTenantId) {
      return { kind: "single", tenantId: actorTenantId };
    }
    throw new ForbiddenException(
      "Admins can only access access events for their own tenant",
    );
  }

  if (actorRole === "super_admin") {
    if (!requestedTenantId) {
      return { kind: "many", tenantIds: authorizedTenantIds };
    }
    if (authorizedTenantIds.includes(requestedTenantId)) {
      return { kind: "single", tenantId: requestedTenantId };
    }
    throw new ForbiddenException(
      "Requested tenant is not in the authorized set",
    );
  }

  throw new ForbiddenException("Role not permitted to list access events");
}

function dateToUtc(dateStr: string, isEndOfDay: boolean): string {
  return isEndOfDay ? `${dateStr}T23:59:59.999Z` : `${dateStr}T00:00:00.000Z`;
}

function getTodayUTC(): { dateFromUTC: string; dateToUTC: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return {
    dateFromUTC: `${y}-${m}-${d}T00:00:00.000Z`,
    dateToUTC: `${y}-${m}-${d}T23:59:59.999Z`,
  };
}

@Injectable()
export class AccessEventsService {
  constructor(
    private readonly repository: AccessEventsRepository,
    private readonly tenantsService: TenantsService,
  ) {}

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

  async list(
    query: AccessEventListQueryInput,
    actorUser: AuthActor,
  ): Promise<AccessEventListResponse> {
    const actorRole = (actorUser.app_metadata?.role ?? "resident") as Role;
    const actorTenantId = actorUser.app_metadata?.tenant_id ?? "";

    let authorizedTenantIds: string[] = [];
    if (actorRole === "super_admin") {
      const tenants = await this.tenantsService.findAll(actorUser, actorTenantId);
      authorizedTenantIds = tenants.map((t) => t.id);
    } else if (actorRole === "admin") {
      authorizedTenantIds = actorTenantId ? [actorTenantId] : [];
    }

    const scope = resolveTenantScope(
      actorRole,
      actorTenantId,
      query.tenantId,
      authorizedTenantIds,
    );

    // Compute date window. Defaults to "today" in UTC when no range is provided.
    // When only `dateFrom` is set the day is interpreted as [start, end-of-day].
    const today = getTodayUTC();
    const dateFromUTC = query.dateFrom
      ? dateToUtc(query.dateFrom, false)
      : today.dateFromUTC;
    const dateToUTC = query.dateTo
      ? dateToUtc(query.dateTo, true)
      : query.dateFrom
      ? dateToUtc(query.dateFrom, true)
      : today.dateToUTC;

    const searchTerm = query.search?.trim();

    const { data, total } = searchTerm
      ? await this.repository.searchList(
          {
            personType: query.personType,
            page: query.page,
            pageSize: query.pageSize,
            dateFromUTC,
            dateToUTC,
            residentId: query.residentId,
            search: searchTerm,
          },
          scope,
        )
      : await this.repository.list(
          {
            personType: query.personType,
            page: query.page,
            pageSize: query.pageSize,
            dateFromUTC,
            dateToUTC,
            residentId: query.residentId,
          },
          scope,
        );

    return {
      data,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  async exportCsv(
    query: AccessEventExportQueryInput,
    actorUser: AuthActor,
  ): Promise<StreamableFile> {
    const actorRole = (actorUser.app_metadata?.role ?? "resident") as Role;
    const actorTenantId = actorUser.app_metadata?.tenant_id ?? "";

    let authorizedTenantIds: string[] = [];
    if (actorRole === "super_admin") {
      const tenants = await this.tenantsService.findAll(
        actorUser,
        actorTenantId,
      );
      authorizedTenantIds = tenants.map((t) => t.id);
    } else if (actorRole === "admin") {
      authorizedTenantIds = actorTenantId ? [actorTenantId] : [];
    }

    const scope = resolveTenantScope(
      actorRole,
      actorTenantId,
      query.tenantId,
      authorizedTenantIds,
    );

    const today = getTodayUTC();
    const dateFromUTC = query.dateFrom
      ? dateToUtc(query.dateFrom, false)
      : today.dateFromUTC;
    const dateToUTC = query.dateTo
      ? dateToUtc(query.dateTo, true)
      : query.dateFrom
        ? dateToUtc(query.dateFrom, true)
        : today.dateToUTC;

    const locale = (query.locale ?? "en") as LogbookLocale;
    const showTenant = scope.kind === "many";
    const personType = query.personType;
    const searchTerm = query.search?.trim();

    // Filename: logbook-<subpage>-<yyyy-mm-dd>.csv (today in UTC).
    const now = new Date();
    const fileDate = `${now.getUTCFullYear()}-${String(
      now.getUTCMonth() + 1,
    ).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
    const subpageName =
      personType === "service_provider"
        ? "providers"
        : personType === "resident"
          ? "residents"
          : "visitors";
    const filename = `logbook-${subpageName}-${fileDate}.csv`;

    const iterator = this.repository.exportIterator(
      {
        personType,
        dateFromUTC,
        dateToUTC,
        residentId: query.residentId,
        search: searchTerm || undefined,
      },
      scope,
    );

    const headerRow = getHeaderRow(personType, locale, showTenant);

    // Node Readable wrapping the async generator. Yields BOM + header first,
    // then CSV chunks one batch at a time, then ends when the iterator is done.
    async function* generate(): AsyncGenerator<string> {
      yield CSV_BOM + headerRow;
      for await (const batch of iterator) {
        const chunk = batch
          .map((item) => itemToRow(item, personType, locale, showTenant))
          .join("");
        if (chunk.length > 0) yield chunk;
      }
    }

    const stream = Readable.from(generate(), { encoding: "utf-8" });

    return new StreamableFile(stream, {
      type: "text/csv; charset=utf-8",
      disposition: `attachment; filename="${filename}"`,
    });
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
