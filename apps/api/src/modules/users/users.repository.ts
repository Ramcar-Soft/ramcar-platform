import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../infrastructure/supabase/supabase.service";
import type { UserFiltersDto } from "./dto/user-filters.dto";
import type { CreateUserDto } from "./dto/create-user.dto";
import type { UpdateUserDto } from "./dto/update-user.dto";
import { NO_EMAIL_SUFFIX, type UserStatus } from "@ramcar/shared";
import { applyTenantScope, type TenantScope } from "../../common/utils/tenant-scope";

@Injectable()
export class UsersRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async list(filters: UserFiltersDto, scope?: TenantScope) {
    const client = this.supabase.getClient();
    const { page, pageSize, search, status, sortBy, sortOrder } = filters;

    let query = client
      .from("profiles")
      .select("*, tenants!inner(name)", { count: "exact" });

    if (filters.tenantId) {
      query = query.eq("tenant_id", filters.tenantId);
    } else if (scope) {
      query = applyTenantScope(query, scope) as typeof query;
    }

    if (scope?.role !== "super_admin") {
      query = query.neq("role", "super_admin");
    }

    if (filters.role) {
      query = query.eq("role", filters.role);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,address.ilike.%${search}%,email.ilike.%${search}%,username.ilike.%${search}%,phone.ilike.%${search}%,role.ilike.%${search}%`,
      );
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return { data: data ?? [], total: count ?? 0 };
  }

  async getByAuthUserId(authUserId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from("profiles")
      .select("id")
      .eq("user_id", authUserId)
      .single();

    if (error) throw error;
    return data;
  }

  async getById(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from("profiles")
      .select("*, tenants!inner(name)")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  }

  async create(dto: CreateUserDto) {
    const client = this.supabase.getClient();

    const effectiveTenantId =
      dto.role === "resident"
        ? (dto as { tenantId: string }).tenantId
        : dto.role === "admin" || dto.role === "guard"
          ? (dto as { primary_tenant_id: string }).primary_tenant_id
          : null;

    const effectiveTenantIds =
      dto.role === "admin" || dto.role === "guard"
        ? (dto as { tenant_ids: string[] }).tenant_ids
        : undefined;

    const hasPassword = dto.password && dto.password.length > 0;
    const password = hasPassword
      ? dto.password!
      : Math.random().toString(36).slice(2) +
        Math.random().toString(36).slice(2);

    const hasRealEmail = Boolean(dto.email && dto.email.length > 0);
    // Supabase Auth requires email or phone; when neither is provided we mint a
    // synthetic placeholder so auth.users stays valid. The profiles row stores
    // NULL — extractUserProfile() strips this suffix on the way back out.
    const authEmail = hasRealEmail
      ? dto.email!
      : `${randomUUID()}${NO_EMAIL_SUFFIX}`;

    const { data: authUser, error: authError } =
      await client.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        app_metadata: {
          tenant_id: effectiveTenantId,
          role: dto.role,
          ...(effectiveTenantIds ? { tenant_ids: effectiveTenantIds } : {}),
        },
        user_metadata: {
          full_name: dto.fullName,
        },
      });

    if (authError) throw authError;

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .insert({
        user_id: authUser.user.id,
        tenant_id: effectiveTenantId,
        full_name: dto.fullName,
        email: hasRealEmail ? dto.email! : null,
        role: dto.role,
        address: dto.address || null,
        username: dto.username || null,
        phone: dto.phone || null,
        phone_type: dto.phoneType || null,
        status: "active",
        user_group_ids: dto.userGroupIds,
        observations: dto.observations || null,
      })
      .select("*, tenants!inner(name)")
      .single();

    if (profileError) {
      await client.auth.admin.deleteUser(authUser.user.id);
      throw profileError;
    }

    let recoveryLink: string | null = null;
    if (!hasPassword && hasRealEmail) {
      const { data: linkData } = await client.auth.admin.generateLink({
        type: "recovery",
        email: dto.email!,
      });
      recoveryLink = linkData?.properties?.action_link ?? null;
    }

    return { profile, recoveryLink };
  }

  async update(id: string, dto: UpdateUserDto) {
    const client = this.supabase.getClient();

    const { data: existing, error: fetchError } = await client
      .from("profiles")
      .select("user_id, role, tenant_id, email")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    const effectiveUpdateTenantId =
      dto.role === "resident"
        ? (dto as { tenantId?: string }).tenantId
        : dto.role === "admin" || dto.role === "guard"
          ? (dto as { primary_tenant_id?: string }).primary_tenant_id
          : undefined;

    const effectiveUpdateTenantIds =
      dto.role === "admin" || dto.role === "guard"
        ? (dto as { tenant_ids?: string[] }).tenant_ids
        : undefined;

    const updateData: Record<string, unknown> = {};
    if (dto.fullName !== undefined) updateData.full_name = dto.fullName;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (effectiveUpdateTenantId !== undefined) updateData.tenant_id = effectiveUpdateTenantId;
    if (dto.address !== undefined) updateData.address = dto.address || null;
    if (dto.username !== undefined) updateData.username = dto.username || null;
    if (dto.phone !== undefined) updateData.phone = dto.phone || null;
    if (dto.phoneType !== undefined)
      updateData.phone_type = dto.phoneType || null;
    if (dto.userGroupIds !== undefined)
      updateData.user_group_ids = dto.userGroupIds;
    if (dto.observations !== undefined)
      updateData.observations = dto.observations || null;

    const { data: profile, error: updateError } = await client
      .from("profiles")
      .update(updateData)
      .eq("id", id)
      .select("*, tenants!inner(name)")
      .single();

    if (updateError) throw updateError;

    const needsAuthUpdate =
      (dto.role && dto.role !== existing.role) ||
      (effectiveUpdateTenantId && effectiveUpdateTenantId !== existing.tenant_id) ||
      (dto.email && dto.email !== existing.email) ||
      effectiveUpdateTenantIds !== undefined;

    if (needsAuthUpdate) {
      const authUpdate: Record<string, unknown> = {};
      if (dto.email && dto.email !== existing.email) {
        authUpdate.email = dto.email;
      }

      const appMetadata: Record<string, unknown> = {};
      if (dto.role && dto.role !== existing.role) appMetadata.role = dto.role;
      if (effectiveUpdateTenantId && effectiveUpdateTenantId !== existing.tenant_id) {
        appMetadata.tenant_id = effectiveUpdateTenantId;
      }
      if (effectiveUpdateTenantIds !== undefined) {
        appMetadata.tenant_ids = effectiveUpdateTenantIds;
      }

      if (Object.keys(appMetadata).length > 0) {
        authUpdate.app_metadata = appMetadata;
      }

      if (Object.keys(authUpdate).length > 0) {
        await client.auth.admin.updateUserById(existing.user_id, authUpdate);
      }
    }

    return profile;
  }

  async toggleStatus(id: string, status: UserStatus) {
    const client = this.supabase.getClient();

    const { data: existing, error: fetchError } = await client
      .from("profiles")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    const { data: profile, error: updateError } = await client
      .from("profiles")
      .update({ status })
      .eq("id", id)
      .select("*, tenants!inner(name)")
      .single();

    if (updateError) throw updateError;

    const banned = status === "inactive";
    await client.auth.admin.updateUserById(existing.user_id, {
      ban_duration: banned ? "876000h" : "none",
    });

    return profile;
  }

  async countActiveSuperAdmins(): Promise<number> {
    const { count, error } = await this.supabase
      .getClient()
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin")
      .eq("status", "active");

    if (error) throw error;
    return count ?? 0;
  }

  async checkEmailExists(email: string, excludeId?: string): Promise<boolean> {
    let query = this.supabase
      .getClient()
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("email", email);

    if (excludeId) query = query.neq("id", excludeId);
    const { count } = await query;
    return (count ?? 0) > 0;
  }

  async checkUsernameExists(
    username: string,
    excludeId?: string,
  ): Promise<boolean> {
    let query = this.supabase
      .getClient()
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("username", username);

    if (excludeId) query = query.neq("id", excludeId);
    const { count } = await query;
    return (count ?? 0) > 0;
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

  async listUserTenantsByUserIds(
    userIds: string[],
  ): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (userIds.length === 0) return map;
    const { data, error } = await this.supabase
      .getClient()
      .from("user_tenants")
      .select("user_id, tenant_id, created_at")
      .in("user_id", userIds)
      .order("created_at", { ascending: true });
    if (error) throw error;
    for (const row of data ?? []) {
      const uid = row.user_id as string;
      const tid = row.tenant_id as string;
      const list = map.get(uid) ?? [];
      list.push(tid);
      map.set(uid, list);
    }
    return map;
  }

  async syncUserTenants(
    userId: string,
    tenantIds: string[],
    primaryTenantId: string,
    assignedBy: string,
  ): Promise<string[]> {
    const { data, error } = await this.supabase
      .getClient()
      .rpc("sync_user_tenants", {
        p_user_id: userId,
        p_tenant_ids: tenantIds,
        p_primary_tenant_id: primaryTenantId,
        p_assigned_by: assignedBy,
      });
    if (error) throw error;
    return (data as string[] | null) ?? [];
  }
}
