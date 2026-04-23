import { ConflictException, Injectable } from "@nestjs/common";
import { TenantsRepository } from "../tenants.repository";
import { generateUniqueSlug } from "../utils/to-slug";
import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import { syncUserAppMetadata } from "../../users/utils/sync-user-app-metadata";
import type { CreateTenantDto } from "@ramcar/shared";
import type { TenantScope } from "../../../common/utils/tenant-scope";

@Injectable()
export class CreateTenantUseCase {
  constructor(
    private readonly repository: TenantsRepository,
    private readonly supabase: SupabaseService,
  ) {}

  async execute(
    dto: CreateTenantDto,
    scope: TenantScope,
    actorId: string,
    actorRole: string,
  ) {
    if (await this.repository.nameExists(dto.name)) {
      throw new ConflictException("tenants.validation.nameExists");
    }

    const slug = await generateUniqueSlug(
      dto.name,
      (s) => this.repository.slugExists(s),
    );

    const tenant = await this.repository.create(dto, actorId, slug);

    // TODO: enforce tenant limit per admin based on subscription tier
    if (actorRole === "admin") {
      await this.repository.insertUserTenant(actorId, tenant.id, actorId);

      // FR-028a: mirror user_tenants into auth.users.raw_app_meta_data.tenant_ids
      // so the user record stays in lockstep with the join table. The
      // custom_access_token_hook remains authoritative at token issue; any
      // failure here must surface so the caller retries (no silent drift).
      const tenantIds = await this.repository.listUserTenantIds(actorId);
      await syncUserAppMetadata(this.supabase.getClient(), actorId, {
        tenant_ids: tenantIds,
      });
    }

    return tenant;
  }
}
