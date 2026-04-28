import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { VehiclesService } from "../vehicles.service";
import type { VehiclesRepository } from "../vehicles.repository";
import type { TenantScope } from "../../../common/utils/tenant-scope";

const TENANT_ID = "11111111-1111-1111-1111-111111111111";
const adminScope: TenantScope = {
  role: "admin",
  scope: "list",
  tenantId: TENANT_ID,
  tenantIds: [TENANT_ID],
};

function makeRepo(overrides: Partial<VehiclesRepository> = {}): VehiclesRepository {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findByVisitPersonId: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    ...overrides,
  } as unknown as VehiclesRepository;
}

const baseRow = {
  id: "vehicle-1",
  tenant_id: TENANT_ID,
  user_id: null,
  visit_person_id: null,
  vehicle_type: "car",
  brand: null,
  model: null,
  plate: null,
  color: null,
  notes: null,
  year: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("VehiclesService.create", () => {
  it("forbids guards creating resident vehicles", async () => {
    const repo = makeRepo();
    const service = new VehiclesService(repo);
    await expect(
      service.create(
        { ownerType: "user", userId: "u1", vehicleType: "car" } as never,
        adminScope,
        "guard",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("allows guards to create visit-person vehicles", async () => {
    const repo = makeRepo({
      create: jest.fn().mockResolvedValue({ ...baseRow, visit_person_id: "vp1" }),
    });
    const service = new VehiclesService(repo);
    await service.create(
      { ownerType: "visitPerson", visitPersonId: "vp1", vehicleType: "car" } as never,
      adminScope,
      "guard",
    );
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it("allows admin to create resident vehicles", async () => {
    const repo = makeRepo({
      create: jest.fn().mockResolvedValue({ ...baseRow, user_id: "u1" }),
    });
    const service = new VehiclesService(repo);
    await service.create(
      { ownerType: "user", userId: "u1", vehicleType: "car" } as never,
      adminScope,
      "admin",
    );
    expect(repo.create).toHaveBeenCalledTimes(1);
  });
});

describe("VehiclesService.update", () => {
  it("throws NotFoundException when the vehicle is missing or soft-deleted", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const service = new VehiclesService(repo);
    await expect(
      service.update("missing", { plate: "X" }, adminScope, "admin"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("forbids guards updating resident-owned vehicles", async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue({ ...baseRow, user_id: "u1" }),
    });
    const service = new VehiclesService(repo);
    await expect(
      service.update("vehicle-1", { plate: "X" }, adminScope, "guard"),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("allows guards to update visit-person-owned vehicles", async () => {
    const repo = makeRepo({
      findById: jest
        .fn()
        .mockResolvedValue({ ...baseRow, visit_person_id: "vp1" }),
      update: jest.fn().mockResolvedValue({ ...baseRow, visit_person_id: "vp1", plate: "X" }),
    });
    const service = new VehiclesService(repo);
    const result = await service.update(
      "vehicle-1",
      { plate: "X" },
      adminScope,
      "guard",
    );
    expect(result.plate).toBe("X");
    expect(repo.update).toHaveBeenCalledWith("vehicle-1", { plate: "X" }, TENANT_ID);
  });

  it("allows admin to update resident vehicles and forwards the partial dto", async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue({ ...baseRow, user_id: "u1" }),
      update: jest.fn().mockResolvedValue({ ...baseRow, user_id: "u1", plate: "Y" }),
    });
    const service = new VehiclesService(repo);
    await service.update("vehicle-1", { plate: "Y" }, adminScope, "admin");
    expect(repo.update).toHaveBeenCalledWith("vehicle-1", { plate: "Y" }, TENANT_ID);
  });
});

describe("VehiclesService.remove", () => {
  it("throws NotFoundException when the vehicle is missing", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const service = new VehiclesService(repo);
    await expect(
      service.remove("missing", adminScope, "admin"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("forbids guards deleting resident vehicles", async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue({ ...baseRow, user_id: "u1" }),
    });
    const service = new VehiclesService(repo);
    await expect(
      service.remove("vehicle-1", adminScope, "guard"),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.softDelete).not.toHaveBeenCalled();
  });

  it("admin delete soft-deletes via the repository", async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue({ ...baseRow, user_id: "u1" }),
      softDelete: jest.fn().mockResolvedValue(1),
    });
    const service = new VehiclesService(repo);
    await service.remove("vehicle-1", adminScope, "admin");
    expect(repo.softDelete).toHaveBeenCalledWith("vehicle-1", TENANT_ID);
  });

  it("treats softDelete count of 0 as NotFound (concurrent delete)", async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue({ ...baseRow, user_id: "u1" }),
      softDelete: jest.fn().mockResolvedValue(0),
    });
    const service = new VehiclesService(repo);
    await expect(
      service.remove("vehicle-1", adminScope, "admin"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
