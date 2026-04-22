import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import {
  AccessEventsService,
  resolveTenantScope,
} from "../access-events.service";
import { AccessEventsRepository } from "../access-events.repository";
import { TenantsService } from "../../tenants/tenants.service";

// ---------------------------------------------------------------------------
// resolveTenantScope — pure function tests
// ---------------------------------------------------------------------------

describe("resolveTenantScope", () => {
  const authorizedIds = ["t1", "t2", "t3"];

  // admin scenarios
  it("admin + no tenantId → single own tenant", () => {
    expect(
      resolveTenantScope("admin", "t1", undefined, []),
    ).toEqual({ kind: "single", tenantId: "t1" });
  });

  it("admin + same tenantId → single own tenant", () => {
    expect(
      resolveTenantScope("admin", "t1", "t1", []),
    ).toEqual({ kind: "single", tenantId: "t1" });
  });

  it("admin + different tenantId → throws ForbiddenException", () => {
    expect(() =>
      resolveTenantScope("admin", "t1", "t2", []),
    ).toThrow(ForbiddenException);
  });

  it("admin + different tenantId → error message mentions own tenant", () => {
    expect(() =>
      resolveTenantScope("admin", "t1", "t2", []),
    ).toThrow(/own tenant/i);
  });

  // super_admin scenarios
  it("super_admin + no tenantId → many with authorized set", () => {
    expect(
      resolveTenantScope("super_admin", "", undefined, authorizedIds),
    ).toEqual({ kind: "many", tenantIds: authorizedIds });
  });

  it("super_admin + tenantId in set → single", () => {
    expect(
      resolveTenantScope("super_admin", "", "t2", authorizedIds),
    ).toEqual({ kind: "single", tenantId: "t2" });
  });

  it("super_admin + tenantId NOT in set → throws ForbiddenException", () => {
    expect(() =>
      resolveTenantScope("super_admin", "", "tX", authorizedIds),
    ).toThrow(ForbiddenException);
  });

  it("super_admin + no tenantId + empty authorized set → many with empty array", () => {
    expect(
      resolveTenantScope("super_admin", "", undefined, []),
    ).toEqual({ kind: "many", tenantIds: [] });
  });

  // disallowed role
  it("guard role → throws ForbiddenException", () => {
    expect(() =>
      resolveTenantScope("guard", "t1", undefined, []),
    ).toThrow(ForbiddenException);
  });

  it("resident role → throws ForbiddenException", () => {
    expect(() =>
      resolveTenantScope("resident", "t1", undefined, []),
    ).toThrow(ForbiddenException);
  });
});

// ---------------------------------------------------------------------------
// AccessEventsService.list — integration with mocked repo + tenantsService
// ---------------------------------------------------------------------------

const mockRepo = {
  list: jest.fn(),
  searchList: jest.fn(),
};

const mockTenants = {
  findAll: jest.fn(),
};

function makeAdminUser(tenantId = "t1") {
  return { id: "u1", app_metadata: { role: "admin", tenant_id: tenantId } };
}

function makeSuperAdminUser() {
  return { id: "u2", app_metadata: { role: "super_admin", tenant_id: "" } };
}

describe("AccessEventsService.list", () => {
  let service: AccessEventsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRepo.list.mockResolvedValue({ data: [], total: 0 });
    mockRepo.searchList.mockResolvedValue({ data: [], total: 0 });
    mockTenants.findAll.mockResolvedValue([
      { id: "t1", name: "Tenant 1" },
      { id: "t2", name: "Tenant 2" },
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessEventsService,
        { provide: AccessEventsRepository, useValue: mockRepo },
        { provide: TenantsService, useValue: mockTenants },
      ],
    }).compile();

    service = module.get<AccessEventsService>(AccessEventsService);
  });

  it("returns paginated meta with correct structure", async () => {
    const adminUser = makeAdminUser();
    const result = await service.list(
      { personType: "visitor", page: 1, pageSize: 25, locale: "en" },
      adminUser,
    );

    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("meta");
    expect(result.meta).toEqual({
      page: 1,
      pageSize: 25,
      total: 0,
      totalPages: 1,
    });
  });

  it("defaults dateFrom to today in UTC when not provided", async () => {
    const adminUser = makeAdminUser();
    await service.list({ personType: "visitor", page: 1, pageSize: 25, locale: "en" }, adminUser);

    const callArgs = mockRepo.list.mock.calls[0][0];
    expect(callArgs.dateFromUTC).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/);
    expect(callArgs.dateToUTC).toMatch(/^\d{4}-\d{2}-\d{2}T23:59:59\.999Z$/);
  });

  it("uses provided dateFrom and defaults dateTo to end of same day", async () => {
    const adminUser = makeAdminUser();
    await service.list(
      { personType: "visitor", page: 1, pageSize: 25, dateFrom: "2026-04-01", locale: "en" },
      adminUser,
    );

    const callArgs = mockRepo.list.mock.calls[0][0];
    expect(callArgs.dateFromUTC).toBe("2026-04-01T00:00:00.000Z");
    expect(callArgs.dateToUTC).toBe("2026-04-01T23:59:59.999Z");
  });

  it("uses provided dateFrom and dateTo range", async () => {
    const adminUser = makeAdminUser();
    await service.list(
      {
        personType: "visitor",
        page: 1,
        pageSize: 25,
        dateFrom: "2026-04-01",
        dateTo: "2026-04-22",
        locale: "en",
      },
      adminUser,
    );

    const callArgs = mockRepo.list.mock.calls[0][0];
    expect(callArgs.dateFromUTC).toBe("2026-04-01T00:00:00.000Z");
    expect(callArgs.dateToUTC).toBe("2026-04-22T23:59:59.999Z");
  });

  it("uses searchList when search is present and non-empty", async () => {
    const adminUser = makeAdminUser();
    await service.list(
      { personType: "visitor", page: 1, pageSize: 25, search: "john", locale: "en" },
      adminUser,
    );

    expect(mockRepo.searchList).toHaveBeenCalledWith(
      expect.objectContaining({ search: "john" }),
      expect.objectContaining({ kind: "single", tenantId: "t1" }),
    );
    expect(mockRepo.list).not.toHaveBeenCalled();
  });

  it("uses searchList with trimmed search term", async () => {
    const adminUser = makeAdminUser();
    await service.list(
      { personType: "visitor", page: 1, pageSize: 25, search: "  john  ", locale: "en" },
      adminUser,
    );

    expect(mockRepo.searchList).toHaveBeenCalledWith(
      expect.objectContaining({ search: "john" }),
      expect.any(Object),
    );
  });

  it("uses list (not searchList) when search is absent", async () => {
    const adminUser = makeAdminUser();
    await service.list({ personType: "visitor", page: 1, pageSize: 25, locale: "en" }, adminUser);

    expect(mockRepo.list).toHaveBeenCalledTimes(1);
    expect(mockRepo.searchList).not.toHaveBeenCalled();
  });

  it("uses list (not searchList) when search is whitespace only", async () => {
    const adminUser = makeAdminUser();
    await service.list(
      { personType: "visitor", page: 1, pageSize: 25, search: "   ", locale: "en" },
      adminUser,
    );

    expect(mockRepo.list).toHaveBeenCalledTimes(1);
    expect(mockRepo.searchList).not.toHaveBeenCalled();
  });

  it("admin uses single-tenant scope (own tenantId)", async () => {
    const adminUser = makeAdminUser("t1");
    await service.list({ personType: "visitor", page: 1, pageSize: 25, locale: "en" }, adminUser);

    expect(mockRepo.list).toHaveBeenCalledWith(
      expect.any(Object),
      { kind: "single", tenantId: "t1" },
    );
  });

  it("admin cross-tenant → throws ForbiddenException", async () => {
    const adminUser = makeAdminUser("t1");
    await expect(
      service.list(
        { personType: "visitor", page: 1, pageSize: 25, tenantId: "t2", locale: "en" },
        adminUser,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it("super_admin without tenantId → many-scope with all authorized tenant IDs", async () => {
    const superAdmin = makeSuperAdminUser();
    await service.list({ personType: "visitor", page: 1, pageSize: 25, locale: "en" }, superAdmin);

    expect(mockRepo.list).toHaveBeenCalledWith(
      expect.any(Object),
      { kind: "many", tenantIds: ["t1", "t2"] },
    );
  });

  it("super_admin with specific tenant in authorized set → single-scope", async () => {
    const superAdmin = makeSuperAdminUser();
    await service.list(
      { personType: "visitor", page: 1, pageSize: 25, tenantId: "t1", locale: "en" },
      superAdmin,
    );

    expect(mockRepo.list).toHaveBeenCalledWith(
      expect.any(Object),
      { kind: "single", tenantId: "t1" },
    );
  });

  it("super_admin with empty authorized tenants → empty response", async () => {
    mockTenants.findAll.mockResolvedValue([]);
    const superAdmin = makeSuperAdminUser();

    // repo.list is called with { kind: "many", tenantIds: [] }, but the repository
    // itself handles the early return — so mock it to return empty directly
    mockRepo.list.mockResolvedValue({ data: [], total: 0 });

    const result = await service.list(
      { personType: "visitor", page: 1, pageSize: 25, locale: "en" },
      superAdmin,
    );

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
    // The service forwards to repo.list with the empty many-scope
    expect(mockRepo.list).toHaveBeenCalledWith(
      expect.any(Object),
      { kind: "many", tenantIds: [] },
    );
  });

  it("super_admin with unauthorized tenantId → throws ForbiddenException", async () => {
    const superAdmin = makeSuperAdminUser();
    await expect(
      service.list(
        { personType: "visitor", page: 1, pageSize: 25, tenantId: "unknown", locale: "en" },
        superAdmin,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it("computes totalPages correctly for non-zero totals", async () => {
    mockRepo.list.mockResolvedValue({ data: new Array(10).fill({}), total: 47 });
    const adminUser = makeAdminUser();

    const result = await service.list(
      { personType: "visitor", page: 1, pageSize: 10, locale: "en" },
      adminUser,
    );

    expect(result.meta.totalPages).toBe(5);
  });

  it("totalPages is at least 1 even when total is 0", async () => {
    const adminUser = makeAdminUser();
    const result = await service.list(
      { personType: "visitor", page: 1, pageSize: 25, locale: "en" },
      adminUser,
    );

    expect(result.meta.totalPages).toBe(1);
  });

  it("does not call tenantsService.findAll for admin role", async () => {
    const adminUser = makeAdminUser();
    await service.list({ personType: "visitor", page: 1, pageSize: 25, locale: "en" }, adminUser);

    expect(mockTenants.findAll).not.toHaveBeenCalled();
  });

  it("calls tenantsService.findAll for super_admin role", async () => {
    const superAdmin = makeSuperAdminUser();
    await service.list({ personType: "visitor", page: 1, pageSize: 25, locale: "en" }, superAdmin);

    expect(mockTenants.findAll).toHaveBeenCalledTimes(1);
  });

  it("super_admin aggregate preserves tenantName in repo results (US8)", async () => {
    mockRepo.list.mockResolvedValue({
      data: [
        {
          id: "evt1",
          tenantId: "t1",
          tenantName: "Tenant 1",
          personType: "visitor",
          direction: "entry",
          accessMode: "walk",
          notes: null,
          createdAt: "2026-04-22T10:00:00.000Z",
          visitPerson: null,
          resident: null,
          vehicle: null,
          registeredBy: { id: "g1", fullName: "Guard" },
        },
        {
          id: "evt2",
          tenantId: "t2",
          tenantName: "Tenant 2",
          personType: "visitor",
          direction: "entry",
          accessMode: "walk",
          notes: null,
          createdAt: "2026-04-22T11:00:00.000Z",
          visitPerson: null,
          resident: null,
          vehicle: null,
          registeredBy: { id: "g2", fullName: "Guard2" },
        },
      ],
      total: 2,
    });
    const superAdmin = makeSuperAdminUser();

    const result = await service.list(
      { personType: "visitor", page: 1, pageSize: 25, locale: "en" },
      superAdmin,
    );

    // repo should be called with many-scope for aggregate view
    expect(mockRepo.list).toHaveBeenCalledWith(
      expect.any(Object),
      { kind: "many", tenantIds: ["t1", "t2"] },
    );
    // tenantName flows through to the service response
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toMatchObject({ tenantId: "t1", tenantName: "Tenant 1" });
    expect(result.data[1]).toMatchObject({ tenantId: "t2", tenantName: "Tenant 2" });
  });

  it("super_admin with residentId filter forwards it to repo.list (US7)", async () => {
    const superAdmin = makeSuperAdminUser();
    await service.list(
      {
        personType: "visitor",
        page: 1,
        pageSize: 25,
        tenantId: "t1",
        residentId: "r1",
        locale: "en",
      },
      superAdmin,
    );

    expect(mockRepo.list).toHaveBeenCalledWith(
      expect.objectContaining({ residentId: "r1" }),
      { kind: "single", tenantId: "t1" },
    );
  });

  it("admin with residentId filter forwards it to repo.list (US7)", async () => {
    const adminUser = makeAdminUser("t1");
    await service.list(
      { personType: "resident", page: 1, pageSize: 25, residentId: "r42", locale: "en" },
      adminUser,
    );

    expect(mockRepo.list).toHaveBeenCalledWith(
      expect.objectContaining({ residentId: "r42" }),
      { kind: "single", tenantId: "t1" },
    );
  });
});
