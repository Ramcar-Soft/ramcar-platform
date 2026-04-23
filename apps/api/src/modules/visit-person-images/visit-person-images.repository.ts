import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../infrastructure/supabase/supabase.service";
import { applyTenantScope, type TenantScope } from "../../common/utils/tenant-scope";

@Injectable()
export class VisitPersonImagesRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async create(
    tenantId: string,
    visitPersonId: string,
    imageType: string,
    storagePath: string,
  ) {
    const { data, error } = await this.supabase
      .getClient()
      .from("visit_person_images")
      .insert({
        tenant_id: tenantId,
        visit_person_id: visitPersonId,
        image_type: imageType,
        storage_path: storagePath,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findByVisitPersonId(visitPersonId: string, scope: TenantScope) {
    let query = this.supabase
      .getClient()
      .from("visit_person_images")
      .select()
      .eq("visit_person_id", visitPersonId)
      .order("created_at", { ascending: false });

    query = applyTenantScope(query, scope) as typeof query;
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async findById(id: string, scope: TenantScope) {
    let query = this.supabase
      .getClient()
      .from("visit_person_images")
      .select()
      .eq("id", id);

    query = applyTenantScope(query, scope) as typeof query;
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  }

  async findByPersonAndType(
    visitPersonId: string,
    imageType: string,
    scope: TenantScope,
  ) {
    let query = this.supabase
      .getClient()
      .from("visit_person_images")
      .select()
      .eq("visit_person_id", visitPersonId)
      .eq("image_type", imageType);

    query = applyTenantScope(query, scope) as typeof query;
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  }

  async deleteById(id: string, scope: TenantScope) {
    let query = this.supabase
      .getClient()
      .from("visit_person_images")
      .delete()
      .eq("id", id);

    query = applyTenantScope(query, scope) as typeof query;
    const { error } = await query;
    if (error) throw error;
  }
}
