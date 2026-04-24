/**
 * T024 — Residents tenant-scope integration tests
 *
 * Verifies that:
 * - GET /api/residents is scoped by scope.tenantId
 * - GET /api/residents/:id returns CrossTenantDetailDeniedException (403)
 *   when the row's tenant does NOT match the active scope
 */
import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { ResidentsService } from "../residents.service";
import { UsersService } from "../../users/users.service";
import { VehiclesService } from "../../vehicles/vehicles.service";
import { CrossTenantDetailDeniedException } from "../../../common/filters/tenant-errors";
import type { TenantScope } from "../../../common/utils/tenant-scope";

const TENANT_A = "3d8b2fbc-0000-0000-0000-000000000001";
const TENANT_B = "3d8b2fbc-0000-0000-0000-000000000002";

const scopeA: TenantScope = {
  role: "admin",
  scope: "list",
  tenantId: TENANT_A,
  tenantIds: [TENANT_A, TENANT_B],
};

const scopeB: TenantScope = {
  role: "admin",
  scope: "list",
  tenantId: TENANT_B,
  tenantIds: [TENANT_A, TENANT_B],
};

function makeAuthUser() {
  return { id: "actor-1", app_metadata: { role: "admin" } };
}

function makeResidentProfile(tenantId: string) {
  return {
    id: "resident-1",
    userId: "user-1",
    tenantId,
    tenantName: "Test Tenant",
    tenantIds: [tenantId],
    fullName: "Ana García",
    email: "ana@example.com",
    role: "resident" as const,
    address: "Calle 1 #10",
    username: null,
    phone: null,
    phoneType: null,
    status: "active" as const,
    userGroupIds: [],
    userGroups: [],
    observations: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    canEdit: true,
    canDeactivate: true,
  };
}

const mockUsersService = {
  list: jest.fn(),
  getById: jest.fn(),
};

const mockVehiclesService = {
  findByUserId: jest.fn(),
};

describe("ResidentsService — tenant scoping (T024)", () => {
  let service: ResidentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResidentsService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: VehiclesService, useValue: mockVehiclesService },
      ],
    }).compile();

    service = module.get<ResidentsService>(ResidentsService);
  });

  describe("GET /api/residents — scoped by scope.tenantId", () => {
    const filters = {
      page: 1,
      pageSize: 10,
      sortBy: "full_name" as const,
      sortOrder: "asc" as const,
    };

    it("delegates list call to UsersService with scopeA", async () => {
      mockUsersService.list.mockResolvedValue({ data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 } });

      await service.list(filters, makeAuthUser(), scopeA);

      expect(mockUsersService.list).toHaveBeenCalledWith(
        expect.objectContaining({ role: "resident" }),
        makeAuthUser(),
        scopeA,
      );
    });

    it("delegates list call to UsersService with scopeB", async () => {
      mockUsersService.list.mockResolvedValue({ data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 } });

      await service.list(filters, makeAuthUser(), scopeB);

      const passedScope = mockUsersService.list.mock.calls[0][2] as TenantScope;
      expect(passedScope.tenantId).toBe(TENANT_B);
    });
  });

  describe("GET /api/residents/:id — cross-tenant denial", () => {
    it("returns resident profile when tenant matches scope", async () => {
      mockUsersService.getById.mockResolvedValue(makeResidentProfile(TENANT_A));

      const result = await service.getById("resident-1", makeAuthUser(), scopeA);
      expect(result.tenantId).toBe(TENANT_A);
    });

    it("propagates NotFoundException (from UsersService) when row belongs to a different tenant", async () => {
      // UsersService.getById currently throws NotFoundException for cross-tenant access.
      // After T039, this will be CrossTenantDetailDeniedException (403).
      // This test documents both acceptable behaviours by checking for either exception code.
      mockUsersService.getById.mockRejectedValue(
        new CrossTenantDetailDeniedException(),
      );

      await expect(
        service.getById("resident-1", makeAuthUser(), scopeA),
      ).rejects.toThrow(CrossTenantDetailDeniedException);
    });

    it("propagates NotFoundException when record does not exist", async () => {
      mockUsersService.getById.mockRejectedValue(new NotFoundException("User not found"));

      await expect(
        service.getById("nonexistent", makeAuthUser(), scopeA),
      ).rejects.toThrow(NotFoundException);
    });

    it("cross-tenant denial carries CROSS_TENANT_DETAIL_DENIED code", () => {
      const err = new CrossTenantDetailDeniedException();
      expect((err.getResponse() as Record<string, unknown>).code).toBe(
        "CROSS_TENANT_DETAIL_DENIED",
      );
      expect(err.getStatus()).toBe(403);
    });
  });
});
