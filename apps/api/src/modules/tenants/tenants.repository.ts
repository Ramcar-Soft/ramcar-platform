import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { SupabaseService } from "../../infrastructure/supabase/supabase.service";
import type { TenantScope } from "../../common/utils/tenant-scope";
import type { CreateTenantDto, UpdateTenantDto, TenantListQuery } from "@ramcar/shared";

@Injectable()
export class TenantsRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async list(scope: TenantScope, query: TenantListQuery) {
    const { search, status, page, page_size: pageSize, scope: queryScope, include_inactive } = query;
    const client = this.supabase.getClient();

    let q = client
      .from("tenants")
      .select("id, name, slug, address, status, config, image_path, time_zone, created_at, updated_at", { count: "exact" });

    // Tenant scope filtering — for tenants table the scoping column is "id" not "tenant_id"
    if (queryScope === "selector") {
      if (scope.scope === "list") {
        q = q.in("id", [...scope.tenantIds]);
      } else if (scope.scope === "single") {
        q = q.eq("id", scope.tenantId);
      }
      // super_admin: no filter, show all
      if (!include_inactive && scope.scope !== "all") {
        q = q.eq("status", "active");
      }
    } else {
      if (scope.scope === "list") {
        q = q.in("id", [...scope.tenantIds]);
      } else if (scope.scope === "single") {
        q = q.eq("id", scope.tenantId);
      }
      if (status !== "all") {
        q = q.eq("status", status);
      }
    }

    if (search) {
      const term = `%${search}%`;
      q = q.or(`name.ilike.${term},address.ilike.${term}`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    q = q.order("name").range(from, to);

    const { data, error, count } = await q;
    if (error) throw error;

    return { data: data ?? [], total: count ?? 0 };
  }

  async findById(id: string, scope: TenantScope) {
    const q = this.supabase
      .getClient()
      .from("tenants")
      .select("id, name, slug, address, status, config, image_path, time_zone, created_at, updated_at")
      .eq("id", id);

    if (scope.scope === "list" && !scope.tenantIds.includes(id)) {
      throw new NotFoundException("Tenant not found");
    }
    if (scope.scope === "single" && scope.tenantId !== id) {
      throw new NotFoundException("Tenant not found");
    }

    const { data, error } = await q.single();
    if (error || !data) throw new NotFoundException("Tenant not found");
    return data;
  }

  async create(dto: CreateTenantDto, actorId: string, slug: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from("tenants")
      .insert({
        name: dto.name,
        address: dto.address,
        status: dto.status ?? "active",
        config: dto.config ?? {},
        slug,
      })
      .select("id, name, slug, address, status, config, image_path, time_zone, created_at, updated_at")
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, dto: UpdateTenantDto, scope: TenantScope, actorRole: string) {
    if (actorRole === "admin" && dto.status !== undefined) {
      throw new ForbiddenException("Admins cannot change tenant status");
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.config !== undefined) updateData.config = dto.config;

    let q = this.supabase
      .getClient()
      .from("tenants")
      .update(updateData)
      .eq("id", id);

    if (scope.scope === "list") {
      q = q.in("id", [...scope.tenantIds]);
    } else if (scope.scope === "single") {
      q = q.eq("id", scope.tenantId);
    }

    const { data, error } = await q
      .select("id, name, slug, address, status, config, image_path, time_zone, created_at, updated_at")
      .single();

    if (error || !data) throw new NotFoundException("Tenant not found or not authorized");
    return data;
  }

  async setImagePath(id: string, imagePath: string | null) {
    const { data, error } = await this.supabase
      .getClient()
      .from("tenants")
      .update({ image_path: imagePath })
      .eq("id", id)
      .select("id, name, slug, address, status, config, image_path, time_zone, created_at, updated_at")
      .single();

    if (error || !data) throw new NotFoundException("Tenant not found");
    return data;
  }

  async slugExists(slug: string): Promise<boolean> {
    const { count } = await this.supabase
      .getClient()
      .from("tenants")
      .select("id", { count: "exact", head: true })
      .eq("slug", slug);
    return (count ?? 0) > 0;
  }

  async nameExists(name: string, excludeId?: string): Promise<boolean> {
    // Escape PostgREST ilike wildcards so the check is a case-insensitive exact match.
    const escaped = name.replace(/\\/g, "\\\\").replace(/[%_]/g, "\\$&");
    let q = this.supabase
      .getClient()
      .from("tenants")
      .select("id", { count: "exact", head: true })
      .ilike("name", escaped);
    if (excludeId) q = q.neq("id", excludeId);
    const { count } = await q;
    return (count ?? 0) > 0;
  }

  async insertUserTenant(userId: string, tenantId: string, assignedBy: string) {
    const { error } = await this.supabase
      .getClient()
      .from("user_tenants")
      .insert({ user_id: userId, tenant_id: tenantId, assigned_by: assignedBy });
    if (error && !error.message.includes("duplicate")) throw error;
  }

  async listUserTenantIds(userId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from("user_tenants")
      .select("tenant_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => row.tenant_id as string);
  }
}
