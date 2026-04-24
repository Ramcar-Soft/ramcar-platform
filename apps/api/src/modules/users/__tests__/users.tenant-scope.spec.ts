/**
 * T023 — Users tenant-scope integration tests
 *
 * Verifies that:
 * - GET /api/users is filtered by scope.tenantId
 * - POST /api/users attaches scope.tenantId to the created user
 * - An admin scoped to TENANT_A cannot see users belonging to TENANT_B
 */
import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { CrossTenantDetailDeniedException } from "../../../common/filters/tenant-errors";
import { UsersService } from "../users.service";
import { UsersRepository } from "../users.repository";
import { UserGroupsService } from "../../user-groups/user-groups.service";
import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
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

const mockRepository = {
  list: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  toggleStatus: jest.fn(),
  countActiveSuperAdmins: jest.fn(),
  checkEmailExists: jest.fn(),
  checkUsernameExists: jest.fn(),
  syncUserTenants: jest.fn(),
  listUserTenantIds: jest.fn(),
  listUserTenantsByUserIds: jest.fn(),
};

const mockRpc = jest.fn();
const mockSupabaseService = {
  getClient: () => ({ rpc: mockRpc }),
};

const mockUserGroupsService = {
  findAll: jest.fn().mockResolvedValue([]),
};

function makeAuthUser(userId = "actor-1") {
  return { id: userId, app_metadata: { role: "admin" } };
}

function makeProfileRow(tenantId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: "profile-1",
    user_id: "user-1",
    tenant_id: tenantId,
    full_name: "Test User",
    email: "test@example.com",
    role: "guard",
    address: null,
    username: null,
    phone: null,
    phone_type: null,
    status: "active",
    user_group_ids: [],
    observations: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    tenants: { name: "Tenant A" },
    ...overrides,
  };
}

describe("UsersService — tenant scoping (T023)", () => {
  let service: UsersService;

  const defaultFilters = {
    page: 1,
    pageSize: 10,
    sortBy: "full_name" as const,
    sortOrder: "asc" as const,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRepository.listUserTenantsByUserIds.mockResolvedValue(new Map());
    mockRepository.listUserTenantIds.mockResolvedValue([]);
    mockRepository.syncUserTenants.mockResolvedValue([]);
    mockRpc.mockResolvedValue({ error: null });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockRepository },
        { provide: UserGroupsService, useValue: mockUserGroupsService },
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe("GET /api/users — filtered by scope.tenantId", () => {
    it("passes scopeA to the repository so results are filtered to TENANT_A", async () => {
      mockRepository.list.mockResolvedValue({ data: [], total: 0 });

      await service.list(defaultFilters, makeAuthUser(), scopeA);

      expect(mockRepository.list).toHaveBeenCalledWith(
        defaultFilters,
        scopeA,
      );
    });

    it("passes scopeB to the repository so results are filtered to TENANT_B", async () => {
      mockRepository.list.mockResolvedValue({ data: [], total: 0 });

      await service.list(defaultFilters, makeAuthUser(), scopeB);

      expect(mockRepository.list).toHaveBeenCalledWith(
        defaultFilters,
        scopeB,
      );
    });

    it("two calls with different scopes produce independent repo calls with correct tenantId", async () => {
      mockRepository.list.mockResolvedValue({ data: [], total: 0 });

      await service.list(defaultFilters, makeAuthUser(), scopeA);
      await service.list(defaultFilters, makeAuthUser(), scopeB);

      const firstScope = mockRepository.list.mock.calls[0][1] as TenantScope;
      const secondScope = mockRepository.list.mock.calls[1][1] as TenantScope;

      expect(firstScope.tenantId).toBe(TENANT_A);
      expect(secondScope.tenantId).toBe(TENANT_B);
    });
  });

  describe("getById — cross-tenant isolation", () => {
    it("returns user when tenant matches scope", async () => {
      mockRepository.getById.mockResolvedValue(makeProfileRow(TENANT_A));

      const result = await service.getById("profile-1", makeAuthUser(), scopeA);
      expect(result.tenantId).toBe(TENANT_A);
    });

    it("throws when user belongs to TENANT_B but scope is TENANT_A (single tenantId path)", async () => {
      const singleScope: TenantScope = {
        role: "admin",
        scope: "list",
        tenantId: TENANT_A,
        tenantIds: [],
      };
      mockRepository.getById.mockResolvedValue(makeProfileRow(TENANT_B));

      await expect(
        service.getById("profile-1", makeAuthUser(), singleScope),
      ).rejects.toThrow(CrossTenantDetailDeniedException);
    });
  });

  describe("POST /api/users — scope.tenantId stamped on user_tenants row", () => {
    const guardDto = {
      fullName: "New Guard",
      email: "guard@example.com",
      role: "guard" as const,
      tenant_ids: [TENANT_A],
      primary_tenant_id: TENANT_A,
    };

    beforeEach(() => {
      mockRepository.checkEmailExists.mockResolvedValue(false);
      mockRepository.checkUsernameExists.mockResolvedValue(false);
      mockRepository.create.mockResolvedValue({
        profile: makeProfileRow(TENANT_A),
        recoveryLink: null,
      });
      mockRepository.syncUserTenants.mockResolvedValue([TENANT_A]);
    });

    it("calls syncUserTenants with tenantIds from the DTO (not from a body tenant_id field)", async () => {
      await service.create(guardDto, makeAuthUser(), scopeA);

      expect(mockRepository.syncUserTenants).toHaveBeenCalledWith(
        "user-1",              // profile.user_id
        [TENANT_A],            // dto.tenant_ids
        TENANT_A,              // dto.primary_tenant_id
        "actor-1",             // actorUser.id
      );
    });

    it("rejects creation when dto.tenant_ids contains a tenant outside actor scope", async () => {
      const outOfScopeDto = {
        ...guardDto,
        tenant_ids: ["3d8b2fbc-0000-0000-0000-000000000099"],
        primary_tenant_id: "3d8b2fbc-0000-0000-0000-000000000099",
      };

      await expect(
        service.create(outOfScopeDto, makeAuthUser(), scopeA),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
