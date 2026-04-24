/**
 * T026 — AccessEvents admin list tenant-scope test
 *
 * Verifies that GET /api/access-events (admin list) is filtered by scope.tenantId.
 * This is distinct from the desktop guard booth list; the admin list goes through
 * AccessEventsService.list() which forwards the scope to the repository.
 */
import { Test, TestingModule } from "@nestjs/testing";
import { AccessEventsService } from "../access-events.service";
import { AccessEventsRepository } from "../access-events.repository";
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

const mockRepo = {
  list: jest.fn(),
  searchList: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  findRecentByUserId: jest.fn(),
  findLastByUserId: jest.fn(),
  findRecentByVisitPersonId: jest.fn(),
  exportIterator: jest.fn(),
};

const defaultQuery = {
  personType: "visitor" as const,
  page: 1,
  pageSize: 25,
  locale: "es" as const,
};

describe("AccessEventsService.list — admin list tenant scoping (T026)", () => {
  let service: AccessEventsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRepo.list.mockResolvedValue({ data: [], total: 0 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessEventsService,
        { provide: AccessEventsRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<AccessEventsService>(AccessEventsService);
  });

  it("GET admin list passes scopeA to repository so rows are filtered to TENANT_A", async () => {
    await service.list(defaultQuery, scopeA);

    expect(mockRepo.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 }),
      scopeA,
    );

    const passedScope = mockRepo.list.mock.calls[0][1] as TenantScope;
    expect(passedScope.tenantId).toBe(TENANT_A);
  });

  it("GET admin list passes scopeB to repository so rows are filtered to TENANT_B", async () => {
    await service.list(defaultQuery, scopeB);

    const passedScope = mockRepo.list.mock.calls[0][1] as TenantScope;
    expect(passedScope.tenantId).toBe(TENANT_B);
  });

  it("two sequential admin list calls with different scopes produce independent repo calls", async () => {
    await service.list(defaultQuery, scopeA);
    await service.list(defaultQuery, scopeB);

    const firstScope = mockRepo.list.mock.calls[0][1] as TenantScope;
    const secondScope = mockRepo.list.mock.calls[1][1] as TenantScope;

    expect(firstScope.tenantId).toBe(TENANT_A);
    expect(secondScope.tenantId).toBe(TENANT_B);
  });

  it("uses searchList repo method when search term is present", async () => {
    mockRepo.searchList.mockResolvedValue({ data: [], total: 0 });

    await service.list({ ...defaultQuery, search: "juan" }, scopeA);

    expect(mockRepo.searchList).toHaveBeenCalledWith(
      expect.objectContaining({ search: "juan" }),
      scopeA,
    );
    expect(mockRepo.list).not.toHaveBeenCalled();
  });
});
