import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
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

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "vp-1",
    tenant_id: TENANT_A,
    code: "VP-001",
    type: "visitor",
    status: "flagged",
    full_name: "Test",
    phone: null,
    company: null,
    resident_id: null,
    notes: null,
    registered_by: "u-1",
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

const mockSupabase = {
  getClient: () => ({
    from: () => ({
      select: () => ({
        in: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  }),
};

describe("VisitPersonsService — role rules", () => {
  let service: VisitPersonsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitPersonsService,
        { provide: VisitPersonsRepository, useValue: mockRepository },
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compile();
    service = module.get(VisitPersonsService);
  });

  describe("create", () => {
    it("guard sending status='allowed' is silently coerced to 'flagged'", async () => {
      mockRepository.create.mockResolvedValue(makeRow({ status: "flagged" }));

      await service.create(
        { type: "visitor", fullName: "Jane", status: "allowed" },
        scopeA,
        "guard-profile-1",
        "guard",
      );

      const dtoArg = mockRepository.create.mock.calls[0][0];
      expect(dtoArg.status).toBe("flagged");
    });

    it("admin sending status='allowed' is preserved", async () => {
      mockRepository.create.mockResolvedValue(makeRow({ status: "allowed" }));

      await service.create(
        { type: "visitor", fullName: "Jane", status: "allowed" },
        scopeA,
        "admin-profile-1",
        "admin",
      );

      const dtoArg = mockRepository.create.mock.calls[0][0];
      expect(dtoArg.status).toBe("allowed");
    });

    it("super_admin sending status='allowed' is preserved", async () => {
      mockRepository.create.mockResolvedValue(makeRow({ status: "allowed" }));

      await service.create(
        { type: "visitor", fullName: "Jane", status: "allowed" },
        scopeA,
        "sa-profile-1",
        "super_admin",
      );

      const dtoArg = mockRepository.create.mock.calls[0][0];
      expect(dtoArg.status).toBe("allowed");
    });
  });

  describe("update", () => {
    it("guard sending status throws ForbiddenException and does NOT call repository.update", async () => {
      await expect(
        service.update(
          "vp-1",
          { status: "allowed" },
          scopeA,
          "guard",
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it("guard sending only phone (no status) succeeds", async () => {
      mockRepository.update.mockResolvedValue(makeRow());

      await service.update(
        "vp-1",
        { phone: "+525551234567" },
        scopeA,
        "guard",
      );

      expect(mockRepository.update).toHaveBeenCalledTimes(1);
    });

    it("admin sending status succeeds", async () => {
      mockRepository.update.mockResolvedValue(makeRow({ status: "allowed" }));

      await service.update(
        "vp-1",
        { status: "allowed" },
        scopeA,
        "admin",
      );

      expect(mockRepository.update).toHaveBeenCalledTimes(1);
    });
  });
});
