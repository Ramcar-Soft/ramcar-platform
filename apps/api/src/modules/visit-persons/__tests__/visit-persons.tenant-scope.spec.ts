/**
 * T025 — VisitPersons tenant-scope integration tests
 *
 * Verifies that:
 * - GET /api/visit-persons list is scoped by scope.tenantId
 * - GET /api/visit-persons/:id detail is scoped (applyTenantScope in repository)
 * - POST /api/visit-persons stamps scope.tenantId (not from request body)
 * - PATCH /api/visit-persons/:id uses scope to gate the update
 */
import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { VisitPersonsService } from "../visit-persons.service";
import { VisitPersonsRepository } from "../visit-persons.repository";
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

function makeVisitPersonRow(tenantId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: "vp-1",
    tenant_id: tenantId,
    code: "VP-001",
    type: "visitor",
    status: "allowed",
    full_name: "Juan Visitante",
    phone: null,
    company: null,
    resident_id: null,
    notes: null,
    registered_by: "guard-profile-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const mockRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  list: jest.fn(),
  update: jest.fn(),
};

const mockSupabaseService = {
  getClient: () => ({
    from: () => ({
      select: () => ({
        in: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  }),
};

describe("VisitPersonsService — tenant scoping (T025)", () => {
  let service: VisitPersonsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitPersonsService,
        { provide: VisitPersonsRepository, useValue: mockRepository },
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<VisitPersonsService>(VisitPersonsService);
  });

  describe("GET list — scoped by scope.tenantId", () => {
    const filters = {
      page: 1,
      pageSize: 10,
      sortBy: "created_at" as const,
      sortOrder: "desc" as const,
    };

    it("passes scopeA to repository.list", async () => {
      mockRepository.list.mockResolvedValue({ data: [], count: 0 });

      await service.list(filters, scopeA);

      expect(mockRepository.list).toHaveBeenCalledWith(filters, scopeA);
    });

    it("passes scopeB to repository.list", async () => {
      mockRepository.list.mockResolvedValue({ data: [], count: 0 });

      await service.list(filters, scopeB);

      const passedScope = mockRepository.list.mock.calls[0][1] as TenantScope;
      expect(passedScope.tenantId).toBe(TENANT_B);
    });

    it("two calls with different scopes produce independent tenantId in repo calls", async () => {
      mockRepository.list.mockResolvedValue({ data: [], count: 0 });

      await service.list(filters, scopeA);
      await service.list(filters, scopeB);

      const firstScope = mockRepository.list.mock.calls[0][1] as TenantScope;
      const secondScope = mockRepository.list.mock.calls[1][1] as TenantScope;

      expect(firstScope.tenantId).toBe(TENANT_A);
      expect(secondScope.tenantId).toBe(TENANT_B);
    });
  });

  describe("GET detail — scoped by repository.findById (applyTenantScope)", () => {
    it("returns visit person when found within scope", async () => {
      mockRepository.findById.mockResolvedValue(makeVisitPersonRow(TENANT_A));

      const result = await service.findById("vp-1", scopeA);
      expect(result.tenantId).toBe(TENANT_A);
    });

    it("throws NotFoundException when repository returns null (cross-tenant or missing)", async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findById("vp-1", scopeA)).rejects.toThrow(NotFoundException);
    });

    it("passes scope to repository.findById", async () => {
      mockRepository.findById.mockResolvedValue(makeVisitPersonRow(TENANT_A));

      await service.findById("vp-1", scopeA);

      expect(mockRepository.findById).toHaveBeenCalledWith("vp-1", scopeA);
    });
  });

  describe("POST — stamps scope.tenantId, not from request body", () => {
    const createDto = {
      type: "visitor" as const,
      fullName: "Juan Visitante",
      status: "allowed" as const,
    };

    it("passes scope.tenantId (TENANT_A) to repository.create", async () => {
      mockRepository.create.mockResolvedValue(makeVisitPersonRow(TENANT_A));

      await service.create(createDto, scopeA, "guard-profile-1", "admin");

      expect(mockRepository.create).toHaveBeenCalledWith(
        createDto,
        TENANT_A, // extracted from scope, NOT from DTO body
        "guard-profile-1",
      );
    });

    it("passes scope.tenantId (TENANT_B) when scope is B", async () => {
      mockRepository.create.mockResolvedValue(makeVisitPersonRow(TENANT_B));

      await service.create(createDto, scopeB, "guard-profile-2", "admin");

      expect(mockRepository.create).toHaveBeenCalledWith(
        createDto,
        TENANT_B,
        "guard-profile-2",
      );
    });
  });

  describe("PATCH — scoped update via repository.update", () => {
    it("passes scope to repository.update", async () => {
      mockRepository.update.mockResolvedValue(makeVisitPersonRow(TENANT_A));

      const patch = { status: "flagged" as const };
      await service.update("vp-1", patch, scopeA, "admin");

      expect(mockRepository.update).toHaveBeenCalledWith("vp-1", patch, scopeA);
    });

    it("throws NotFoundException when repository returns null (cross-tenant or missing)", async () => {
      mockRepository.update.mockResolvedValue(null);

      await expect(
        service.update("vp-1", { status: "flagged" as const }, scopeA, "admin"),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
