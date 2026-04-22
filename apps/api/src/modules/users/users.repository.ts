import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../infrastructure/supabase/supabase.service";
import type { UserFiltersDto } from "./dto/user-filters.dto";
import type { CreateUserDto } from "./dto/create-user.dto";
import type { UpdateUserDto } from "./dto/update-user.dto";
import type { UserStatus } from "@ramcar/shared";

@Injectable()
export class UsersRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async list(filters: UserFiltersDto, tenantId?: string) {
    const client = this.supabase.getClient();
    const { page, pageSize, search, status, sortBy, sortOrder } = filters;
    const effectiveTenantId = filters.tenantId ?? tenantId;

    let query = client
      .from("profiles")
      .select("*, tenants!inner(name)", { count: "exact" });

    if (effectiveTenantId) {
      query = query.eq("tenant_id", effectiveTenantId);
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

    const hasPassword = dto.password && dto.password.length > 0;
    const password = hasPassword
      ? dto.password!
      : Math.random().toString(36).slice(2) +
        Math.random().toString(36).slice(2);

    const { data: authUser, error: authError } =
      await client.auth.admin.createUser({
        email: dto.email,
        password,
        email_confirm: true,
        app_metadata: {
          tenant_id: dto.tenantId,
          role: dto.role,
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
        tenant_id: dto.tenantId,
        full_name: dto.fullName,
        email: dto.email,
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
    if (!hasPassword) {
      const { data: linkData } = await client.auth.admin.generateLink({
        type: "recovery",
        email: dto.email,
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

    const updateData: Record<string, unknown> = {};
    if (dto.fullName !== undefined) updateData.full_name = dto.fullName;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.tenantId !== undefined) updateData.tenant_id = dto.tenantId;
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
      (dto.tenantId && dto.tenantId !== existing.tenant_id) ||
      (dto.email && dto.email !== existing.email);

    if (needsAuthUpdate) {
      const authUpdate: Record<string, unknown> = {};
      if (dto.email && dto.email !== existing.email) {
        authUpdate.email = dto.email;
      }

      const appMetadata: Record<string, unknown> = {};
      if (dto.role && dto.role !== existing.role) appMetadata.role = dto.role;
      if (dto.tenantId && dto.tenantId !== existing.tenant_id)
        appMetadata.tenant_id = dto.tenantId;

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
}
