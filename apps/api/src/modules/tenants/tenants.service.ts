import { Injectable } from "@nestjs/common";
import { TenantsRepository } from "./tenants.repository";
import type { Role } from "@ramcar/shared";

interface AuthUser {
  id: string;
  app_metadata?: {
    role?: string;
    tenant_id?: string;
  };
}

@Injectable()
export class TenantsService {
  constructor(private readonly repository: TenantsRepository) {}

  async findAll(actorUser: AuthUser, actorTenantId: string) {
    const actorRole = (actorUser.app_metadata?.role ?? "resident") as Role;
    const tenantScope =
      actorRole === "super_admin" ? undefined : actorTenantId;
    return this.repository.findAll(tenantScope);
  }
}
