import { Injectable, Logger } from "@nestjs/common";
import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import { TenantsRepository } from "../tenants.repository";
import type { TenantScope } from "../../../common/utils/tenant-scope";

const BUCKET = "tenant-images";

@Injectable()
export class DeleteTenantImageUseCase {
  private readonly logger = new Logger(DeleteTenantImageUseCase.name);

  constructor(
    private readonly repository: TenantsRepository,
    private readonly supabase: SupabaseService,
  ) {}

  async execute(tenantId: string, scope: TenantScope) {
    const tenant = await this.repository.findById(tenantId, scope);
    if (tenant.image_path) {
      try {
        await this.supabase.getClient().storage.from(BUCKET).remove([tenant.image_path]);
      } catch (err) {
        this.logger.warn({ tenantId, orphan: tenant.image_path, err }, "Best-effort image removal failed");
      }
    }
    return this.repository.setImagePath(tenantId, null);
  }
}
