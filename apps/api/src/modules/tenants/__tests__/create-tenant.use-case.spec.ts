import { ConflictException } from "@nestjs/common";
import { CreateTenantUseCase } from "../use-cases/create-tenant.use-case";
import type { TenantsRepository } from "../tenants.repository";
import type { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import type { CreateTenantDto } from "@ramcar/shared";
import type { TenantScope } from "../../../common/utils/tenant-scope";

function makeRepo(overrides: Partial<jest.Mocked<TenantsRepository>> = {}) {
  return {
    nameExists: jest.fn().mockResolvedValue(false),
    slugExists: jest.fn().mockResolvedValue(false),
    create: jest.fn().mockResolvedValue({ id: "tenant-new", name: "Acme", slug: "acme" }),
    insertUserTenant: jest.fn().mockResolvedValue(undefined),
    listUserTenantIds: jest.fn().mockResolvedValue(["tenant-prev", "tenant-new"]),
    ...overrides,
  } as unknown as jest.Mocked<TenantsRepository>;
}

function makeSupabase() {
  const rpc = jest.fn().mockResolvedValue({ error: null });
  const client = { rpc };
  return {
    service: { getClient: () => client } as unknown as SupabaseService,
    rpc,
  };
}

const adminScope: TenantScope = { role: "admin", scope: "list", tenantId: "tenant-prev", tenantIds: ["tenant-prev"] };
const superScope: TenantScope = { role: "super_admin", scope: "all", tenantId: "", tenantIds: [] };
const dto: CreateTenantDto = { name: "Acme", address: "123 St", status: "active" } as CreateTenantDto;

describe("CreateTenantUseCase", () => {
  it("inserts a user_tenants row when the actor is an admin", async () => {
    const repo = makeRepo();
    const supa = makeSupabase();
    const useCase = new CreateTenantUseCase(repo, supa.service);

    await useCase.execute(dto, adminScope, "actor-1", "admin");

    expect(repo.nameExists).toHaveBeenCalledWith("Acme");
    expect(repo.create).toHaveBeenCalled();
    expect(repo.insertUserTenant).toHaveBeenCalledWith("actor-1", "tenant-new", "actor-1");
  });

  it("syncs the admin's raw_app_meta_data.tenant_ids with the full set after insert (FR-028a)", async () => {
    const repo = makeRepo();
    const supa = makeSupabase();
    const useCase = new CreateTenantUseCase(repo, supa.service);

    await useCase.execute(dto, adminScope, "actor-1", "admin");

    expect(repo.listUserTenantIds).toHaveBeenCalledWith("actor-1");
    expect(supa.rpc).toHaveBeenCalledWith("sync_user_app_metadata", {
      p_user_id: "actor-1",
      p_patch: { tenant_ids: ["tenant-prev", "tenant-new"] },
    });
  });

  it("skips user_tenants insert AND app_metadata sync for super_admin creators", async () => {
    const repo = makeRepo();
    const supa = makeSupabase();
    const useCase = new CreateTenantUseCase(repo, supa.service);

    await useCase.execute(dto, superScope, "actor-1", "super_admin");

    expect(repo.create).toHaveBeenCalled();
    expect(repo.insertUserTenant).not.toHaveBeenCalled();
    expect(repo.listUserTenantIds).not.toHaveBeenCalled();
    expect(supa.rpc).not.toHaveBeenCalled();
  });

  it("surfaces RPC failures so no silent drift can occur (FR-028a)", async () => {
    const repo = makeRepo();
    const supa = makeSupabase();
    supa.rpc.mockResolvedValueOnce({ error: new Error("rpc down") });
    const useCase = new CreateTenantUseCase(repo, supa.service);

    await expect(useCase.execute(dto, adminScope, "actor-1", "admin")).rejects.toThrow(
      "rpc down",
    );
    expect(repo.insertUserTenant).toHaveBeenCalled();
  });

  it("throws ConflictException and does not insert when the name is already taken", async () => {
    const repo = makeRepo();
    (repo.nameExists as jest.Mock).mockResolvedValueOnce(true);
    const supa = makeSupabase();
    const useCase = new CreateTenantUseCase(repo, supa.service);

    await expect(useCase.execute(dto, adminScope, "actor-1", "admin")).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repo.slugExists).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.insertUserTenant).not.toHaveBeenCalled();
    expect(supa.rpc).not.toHaveBeenCalled();
  });
});
