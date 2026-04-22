import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../../common/guards/tenant.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { ResidentsController } from "../residents.controller";
import { ResidentsService } from "../residents.service";

const allowAllGuard = { canActivate: () => true };

const mockResidentsService = {
  list: jest.fn(),
  getById: jest.fn(),
  getVehicles: jest.fn(),
};

function makeAuthUser(role = "admin", tenantId = "tenant-1") {
  return { id: "actor-1", app_metadata: { role, tenant_id: tenantId } };
}

function makeResidentProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: "resident-1",
    fullName: "Ana García",
    email: "ana@example.com",
    address: "Calle 1 #10",
    status: "active",
    role: "resident",
    tenantId: "tenant-1",
    ...overrides,
  };
}

describe("ResidentsController.getById", () => {
  let controller: ResidentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResidentsController],
      providers: [{ provide: ResidentsService, useValue: mockResidentsService }],
    })
      .overrideGuard(JwtAuthGuard).useValue(allowAllGuard)
      .overrideGuard(TenantGuard).useValue(allowAllGuard)
      .overrideGuard(RolesGuard).useValue(allowAllGuard)
      .compile();

    controller = module.get<ResidentsController>(ResidentsController);
    jest.clearAllMocks();
  });

  it("returns ExtendedUserProfile on happy path", async () => {
    const profile = makeResidentProfile();
    mockResidentsService.getById.mockResolvedValue(profile);

    const result = await controller.getById("resident-1", makeAuthUser(), "tenant-1");

    expect(result).toEqual(profile);
    expect(mockResidentsService.getById).toHaveBeenCalledWith(
      "resident-1",
      makeAuthUser(),
      "tenant-1",
    );
  });

  it("propagates NotFoundException when id does not exist", async () => {
    mockResidentsService.getById.mockRejectedValue(new NotFoundException("Resident not found"));

    await expect(
      controller.getById("nonexistent", makeAuthUser(), "tenant-1"),
    ).rejects.toThrow(NotFoundException);
  });

  it("propagates NotFoundException when id belongs to a different tenant", async () => {
    mockResidentsService.getById.mockRejectedValue(new NotFoundException("Resident not found"));

    await expect(
      controller.getById("resident-1", makeAuthUser("admin", "tenant-2"), "tenant-1"),
    ).rejects.toThrow(NotFoundException);
  });

  it("propagates NotFoundException when profile role is not resident", async () => {
    mockResidentsService.getById.mockRejectedValue(new NotFoundException("Resident not found"));

    await expect(
      controller.getById("guard-profile-id", makeAuthUser(), "tenant-1"),
    ).rejects.toThrow(NotFoundException);
  });

  it("returns inactive residents so the picker can display their name", async () => {
    const profile = makeResidentProfile({ status: "inactive" });
    mockResidentsService.getById.mockResolvedValue(profile);

    const result = await controller.getById("resident-1", makeAuthUser(), "tenant-1");

    expect(result.status).toBe("inactive");
  });
});
