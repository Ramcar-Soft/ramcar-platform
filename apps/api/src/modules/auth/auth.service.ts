import { Injectable, NotFoundException } from "@nestjs/common";
import type { UserProfile } from "@ramcar/shared";
import { SupabaseService } from "../../infrastructure/supabase/supabase.service";

@Injectable()
export class AuthService {
  constructor(private readonly supabase: SupabaseService) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const { data, error } = await this.supabase
      .getClient()
      .from("profiles")
      .select("id, user_id, tenant_id, email, full_name, role")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      throw new NotFoundException("Profile not found");
    }

    return {
      id: data.id,
      userId: data.user_id,
      tenantId: data.tenant_id,
      email: data.email,
      fullName: data.full_name,
      role: data.role,
    };
  }

  async logout(token: string): Promise<void> {
    await this.supabase.getClient().auth.admin.signOut(token);
  }
}
