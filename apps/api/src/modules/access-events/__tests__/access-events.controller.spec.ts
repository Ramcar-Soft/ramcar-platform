import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { AccessEventsController } from "../access-events.controller";
import { AccessEventsService } from "../access-events.service";
import { UsersService } from "../../users/users.service";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../../common/guards/tenant.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import type { TenantScope } from "../../../common/utils/tenant-scope";

const mockEmptyListResponse = {
  data: [],
  meta: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
};

const TENANT_UUID_1 = "00000000-0000-0000-0000-000000000001";
const TENANT_UUID_2 = "00000000-0000-0000-0000-000000000002";
const TENANT_UUID_UNAUTH = "00000000-0000-0000-0000-000000000099";

const adminScope: TenantScope = { role: "admin", scope: "list", tenantId: TENANT_UUID_1, tenantIds: [TENANT_UUID_1] };
const superAdminScope: TenantScope = { role: "super_admin", scope: "all", tenantId: TENANT_UUID_1, tenantIds: [] };

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
      const result = await controller.list(
        { personType: "visitor", page: "1", pageSize: "25" },
        adminScope,
      );

      expect(mockService.list).toHaveBeenCalledTimes(1);
      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({ personType: "visitor" }),
        adminScope,
      );
      expect(result).toEqual(mockEmptyListResponse);
    });

    it("calls service.list for admin with query params", async () => {
      await controller.list(
        { personType: "visitor", page: "1", pageSize: "25", tenantId: TENANT_UUID_1 },
        adminScope,
      );

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TENANT_UUID_1, personType: "visitor" }),
        adminScope,
      );
    });

    it("re-throws ForbiddenException from service when admin attempts cross-tenant access", async () => {
      mockService.list.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.list(
          { personType: "visitor", page: "1", pageSize: "25", tenantId: TENANT_UUID_2 },
          adminScope,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockService.list).toHaveBeenCalledTimes(1);
    });

    it("calls service.list for super_admin without tenantId", async () => {
      await controller.list(
        { personType: "visitor", page: "1", pageSize: "25" },
        superAdminScope,
      );

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({ personType: "visitor" }),
        superAdminScope,
      );
    });

    it("calls service.list for super_admin with a specific tenantId", async () => {
      await controller.list(
        { personType: "visitor", page: "1", pageSize: "25", tenantId: TENANT_UUID_1 },
        superAdminScope,
      );

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TENANT_UUID_1 }),
        superAdminScope,
      );
    });

    it("re-throws ForbiddenException from service when super_admin requests unauthorized tenant", async () => {
      mockService.list.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.list(
          {
            personType: "visitor",
            page: "1",
            pageSize: "25",
            tenantId: TENANT_UUID_UNAUTH,
          },
          superAdminScope,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("forwards all query params to service.list", async () => {
      await controller.list(
        {
          personType: "service_provider",
          page: "2",
          pageSize: "10",
          dateFrom: "2026-04-01",
          dateTo: "2026-04-22",
          search: "john",
        },
        adminScope,
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
        adminScope,
      );
    });
  });
});
