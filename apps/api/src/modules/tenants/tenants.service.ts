import { ConflictException, Injectable } from "@nestjs/common";
import { TenantsRepository } from "./tenants.repository";
import { CreateTenantUseCase } from "./use-cases/create-tenant.use-case";
import type { CreateTenantDto, UpdateTenantDto, TenantListQuery } from "@ramcar/shared";
import type { TenantScope } from "../../common/utils/tenant-scope";

@Injectable()
export class TenantsService {
  constructor(
    private readonly repository: TenantsRepository,
    private readonly createTenantUseCase: CreateTenantUseCase,
  ) {}

  async list(scope: TenantScope, query: TenantListQuery) {
    return this.repository.list(scope, query);
  }

  async findById(id: string, scope: TenantScope) {
    return this.repository.findById(id, scope);
  }

  async create(dto: CreateTenantDto, scope: TenantScope, actorId: string) {
    return this.createTenantUseCase.execute(dto, scope, actorId, scope.role);
  }

  async update(id: string, dto: UpdateTenantDto, scope: TenantScope) {
    if (dto.name !== undefined && (await this.repository.nameExists(dto.name, id))) {
      throw new ConflictException("tenants.validation.nameExists");
    }
    return this.repository.update(id, dto, scope, scope.role);
  }

  async setImagePath(id: string, imagePath: string | null) {
    return this.repository.setImagePath(id, imagePath);
  }

  async findAll(scope: TenantScope) {
    const { data } = await this.repository.list(scope, {
      status: "all",
      page: 1,
      page_size: 100,
      include_inactive: true,
    });
    return data;
  }
}
