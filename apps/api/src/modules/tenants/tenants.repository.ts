import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../infrastructure/supabase/supabase.service";

@Injectable()
export class TenantsRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(tenantId?: string) {
    let query = this.supabase
      .getClient()
      .from("tenants")
      .select("id, name")
      .order("name");

    if (tenantId) {
      query = query.eq("id", tenantId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }
}
