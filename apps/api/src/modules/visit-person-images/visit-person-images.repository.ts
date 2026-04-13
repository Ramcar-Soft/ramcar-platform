import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../infrastructure/supabase/supabase.service";

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

  async findByVisitPersonId(visitPersonId: string, tenantId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from("visit_person_images")
      .select()
      .eq("tenant_id", tenantId)
      .eq("visit_person_id", visitPersonId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async findById(id: string, tenantId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from("visit_person_images")
      .select()
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  }

  async findByPersonAndType(
    visitPersonId: string,
    imageType: string,
    tenantId: string,
  ) {
    const { data, error } = await this.supabase
      .getClient()
      .from("visit_person_images")
      .select()
      .eq("tenant_id", tenantId)
      .eq("visit_person_id", visitPersonId)
      .eq("image_type", imageType)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async deleteById(id: string, tenantId: string) {
    const { error } = await this.supabase
      .getClient()
      .from("visit_person_images")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", id);

    if (error) throw error;
  }
}
