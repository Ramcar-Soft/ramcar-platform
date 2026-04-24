import { ConflictException } from "@nestjs/common";
import { TenantsService } from "../tenants.service";
import type { TenantsRepository } from "../tenants.repository";
import type { CreateTenantUseCase } from "../use-cases/create-tenant.use-case";
import type { TenantScope } from "../../../common/utils/tenant-scope";
import type { UpdateTenantDto } from "@ramcar/shared";

function makeRepo() {
  return {
    nameExists: jest.fn().mockResolvedValue(false),
    update: jest.fn().mockResolvedValue({ id: "t-1", name: "Acme" }),
    list: jest.fn(),
    findById: jest.fn(),
    setImagePath: jest.fn(),
  } as unknown as jest.Mocked<TenantsRepository>;
}

function makeUseCase() {
  return { execute: jest.fn() } as unknown as jest.Mocked<CreateTenantUseCase>;
}

const scope: TenantScope = { role: "super_admin", scope: "all", tenantId: "", tenantIds: [] };

describe("TenantsService.update", () => {
  it("passes through when dto.name is undefined (no uniqueness check)", async () => {
    const repo = makeRepo();
    const useCase = makeUseCase();
    const service = new TenantsService(repo, useCase);

    await service.update("t-1", { address: "Elsewhere" } as UpdateTenantDto, scope);

    expect(repo.nameExists).not.toHaveBeenCalled();
    expect(repo.update).toHaveBeenCalled();
  });

  it("checks name uniqueness excluding the current id when dto.name is set", async () => {
    const repo = makeRepo();
    const useCase = makeUseCase();
    const service = new TenantsService(repo, useCase);

    await service.update("t-1", { name: "Acme" } as UpdateTenantDto, scope);

    expect(repo.nameExists).toHaveBeenCalledWith("Acme", "t-1");
    expect(repo.update).toHaveBeenCalled();
  });

  it("throws ConflictException and does not update when name collides with another tenant", async () => {
    const repo = makeRepo();
    (repo.nameExists as jest.Mock).mockResolvedValueOnce(true);
    const useCase = makeUseCase();
    const service = new TenantsService(repo, useCase);

    await expect(
      service.update("t-1", { name: "Acme" } as UpdateTenantDto, scope),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repo.update).not.toHaveBeenCalled();
  });
});
