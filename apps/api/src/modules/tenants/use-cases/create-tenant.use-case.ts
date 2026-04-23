import { ConflictException, Injectable } from "@nestjs/common";
import { TenantsRepository } from "../tenants.repository";
import { generateUniqueSlug } from "../utils/to-slug";
import type { CreateTenantDto } from "@ramcar/shared";
import type { TenantScope } from "../../../common/utils/tenant-scope";

@Injectable()
export class CreateTenantUseCase {
  constructor(private readonly repository: TenantsRepository) {}

  async execute(dto: CreateTenantDto, scope: TenantScope, actorId: string, actorRole: string) {
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
    }

    return tenant;
  }
}
