import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../infrastructure/supabase/supabase.service";

@Injectable()
export class UserGroupsRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabase
      .getClient()
      .from("user_groups")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) throw error;
    return data;
  }
}
