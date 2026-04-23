import { ConflictException } from "@nestjs/common";
import { CreateTenantUseCase } from "../use-cases/create-tenant.use-case";
import type { TenantsRepository } from "../tenants.repository";
import type { CreateTenantDto } from "@ramcar/shared";
import type { TenantScope } from "../../../common/utils/tenant-scope";

function makeRepo() {
  return {
    nameExists: jest.fn().mockResolvedValue(false),
    slugExists: jest.fn().mockResolvedValue(false),
    create: jest.fn().mockResolvedValue({ id: "tenant-new", name: "Acme", slug: "acme" }),
    insertUserTenant: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<TenantsRepository>;
}

const adminScope: TenantScope = { role: "admin", scope: "list", tenantIds: [] };
const superScope: TenantScope = { role: "super_admin", scope: "all" };
const dto: CreateTenantDto = { name: "Acme", address: "123 St", status: "active" } as CreateTenantDto;

describe("CreateTenantUseCase", () => {
  it("inserts a user_tenants row when the actor is an admin", async () => {
    const repo = makeRepo();
    const useCase = new CreateTenantUseCase(repo);

    await useCase.execute(dto, adminScope, "actor-1", "admin");

    expect(repo.nameExists).toHaveBeenCalledWith("Acme");
    expect(repo.create).toHaveBeenCalled();
    expect(repo.insertUserTenant).toHaveBeenCalledWith("actor-1", "tenant-new", "actor-1");
  });

  it("skips user_tenants insert for super_admin creators", async () => {
    const repo = makeRepo();
    const useCase = new CreateTenantUseCase(repo);

    await useCase.execute(dto, superScope, "actor-1", "super_admin");

    expect(repo.create).toHaveBeenCalled();
    expect(repo.insertUserTenant).not.toHaveBeenCalled();
  });

  it("throws ConflictException and does not insert when the name is already taken", async () => {
    const repo = makeRepo();
    (repo.nameExists as jest.Mock).mockResolvedValueOnce(true);
    const useCase = new CreateTenantUseCase(repo);

    await expect(useCase.execute(dto, adminScope, "actor-1", "admin")).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repo.slugExists).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.insertUserTenant).not.toHaveBeenCalled();
  });
});
