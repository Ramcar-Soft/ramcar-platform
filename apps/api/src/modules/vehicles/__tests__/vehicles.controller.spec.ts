import { Test } from "@nestjs/testing";
import { VehiclesController } from "../vehicles.controller";
import { VehiclesService } from "../vehicles.service";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../../common/guards/tenant.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import type { TenantScope } from "../../../common/utils/tenant-scope";

const TENANT_ID = "11111111-1111-1111-1111-111111111111";
const scope: TenantScope = {
  role: "admin",
  scope: "list",
  tenantId: TENANT_ID,
  tenantIds: [TENANT_ID],
};

describe("VehiclesController", () => {
  let controller: VehiclesController;
  let service: jest.Mocked<VehiclesService>;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      findByUserId: jest.fn(),
      findByVisitPersonId: jest.fn(),
    } as unknown as jest.Mocked<VehiclesService>;

    const module = await Test.createTestingModule({
      controllers: [VehiclesController],
      providers: [{ provide: VehiclesService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(TenantGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get(VehiclesController);
  });

  it("PATCH /:id parses body via updateVehicleSchema and forwards to service", async () => {
    service.update.mockResolvedValue({ id: "v1" } as never);
    await controller.update("v1", { plate: "ABC-1234" }, scope, "admin");
    expect(service.update).toHaveBeenCalledWith(
      "v1",
      { plate: "ABC-1234" },
      scope,
      "admin",
    );
  });

  it("PATCH /:id rejects unknown fields (Zod strict)", async () => {
    await expect(
      controller.update("v1", { ownerType: "user" } as never, scope, "admin"),
    ).rejects.toThrow();
    expect(service.update).not.toHaveBeenCalled();
  });

  it("DELETE /:id forwards id, scope, and role to service.remove", async () => {
    service.remove.mockResolvedValue(undefined);
    await controller.remove("v1", scope, "guard");
    expect(service.remove).toHaveBeenCalledWith("v1", scope, "guard");
  });
});
