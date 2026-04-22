import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { AccessEventsController } from "../access-events.controller";
import { AccessEventsService } from "../access-events.service";
import { UsersService } from "../../users/users.service";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../../common/guards/tenant.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";

const mockEmptyListResponse = {
  data: [],
  meta: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
};

// Use valid UUIDs since the Zod schema validates tenantId as uuid
const TENANT_UUID_1 = "00000000-0000-0000-0000-000000000001";
const TENANT_UUID_2 = "00000000-0000-0000-0000-000000000002";
const TENANT_UUID_UNAUTH = "00000000-0000-0000-0000-000000000099";

function makeAdminUser(tenantId = TENANT_UUID_1) {
  return {
    id: "00000000-0000-0000-0000-000000000010",
    app_metadata: { role: "admin", tenant_id: tenantId },
  };
}

function makeSuperAdminUser() {
  return {
    id: "00000000-0000-0000-0000-000000000020",
    app_metadata: { role: "super_admin", tenant_id: "" },
  };
}

describe("AccessEventsController", () => {
  let controller: AccessEventsController;
  let mockService: { list: jest.Mock };

  beforeEach(async () => {
    mockService = {
      list: jest.fn().mockResolvedValue(mockEmptyListResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccessEventsController],
      providers: [
        { provide: AccessEventsService, useValue: mockService },
        { provide: UsersService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AccessEventsController>(AccessEventsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("calls service.list for admin without tenantId and returns result", async () => {
      const adminUser = makeAdminUser();
      const result = await controller.list(
        { personType: "visitor", page: "1", pageSize: "25" },
        adminUser,
      );

      expect(mockService.list).toHaveBeenCalledTimes(1);
      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({ personType: "visitor" }),
        adminUser,
      );
      expect(result).toEqual(mockEmptyListResponse);
    });

    it("calls service.list for admin with same tenantId (no cross-tenant attempt)", async () => {
      const adminUser = makeAdminUser(TENANT_UUID_1);

      await controller.list(
        { personType: "visitor", page: "1", pageSize: "25", tenantId: TENANT_UUID_1 },
        adminUser,
      );

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TENANT_UUID_1, personType: "visitor" }),
        adminUser,
      );
    });

    it("re-throws ForbiddenException from service when admin attempts cross-tenant access", async () => {
      const adminUser = makeAdminUser(TENANT_UUID_1);
      mockService.list.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.list(
          { personType: "visitor", page: "1", pageSize: "25", tenantId: TENANT_UUID_2 },
          adminUser,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockService.list).toHaveBeenCalledTimes(1);
    });

    it("calls service.list for super_admin without tenantId", async () => {
      const superAdmin = makeSuperAdminUser();

      await controller.list(
        { personType: "visitor", page: "1", pageSize: "25" },
        superAdmin,
      );

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({ personType: "visitor" }),
        superAdmin,
      );
    });

    it("calls service.list for super_admin with a specific tenantId", async () => {
      const superAdmin = makeSuperAdminUser();

      await controller.list(
        { personType: "visitor", page: "1", pageSize: "25", tenantId: TENANT_UUID_1 },
        superAdmin,
      );

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TENANT_UUID_1 }),
        superAdmin,
      );
    });

    it("re-throws ForbiddenException from service when super_admin requests unauthorized tenant", async () => {
      const superAdmin = makeSuperAdminUser();
      mockService.list.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.list(
          {
            personType: "visitor",
            page: "1",
            pageSize: "25",
            tenantId: TENANT_UUID_UNAUTH,
          },
          superAdmin,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("forwards all query params to service.list", async () => {
      const adminUser = makeAdminUser();

      await controller.list(
        {
          personType: "service_provider",
          page: "2",
          pageSize: "10",
          dateFrom: "2026-04-01",
          dateTo: "2026-04-22",
          search: "john",
        },
        adminUser,
      );

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          personType: "service_provider",
          page: 2,
          pageSize: 10,
          dateFrom: "2026-04-01",
          dateTo: "2026-04-22",
          search: "john",
        }),
        adminUser,
      );
    });
  });
});
