import { Test, TestingModule } from "@nestjs/testing";
import { AccessEventsService } from "../access-events.service";
import { AccessEventsRepository } from "../access-events.repository";
import type { TenantScope } from "../../../common/utils/tenant-scope";

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

const adminScope: TenantScope = { role: "admin", scope: "list", tenantIds: ["t1"] };
const superAdminScope: TenantScope = { role: "super_admin", scope: "all" };
// const multiTenantScope: TenantScope = { role: "admin", scope: "list", tenantIds: ["t1", "t2"] };

describe("AccessEventsService.list", () => {
  let service: AccessEventsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRepo.list.mockResolvedValue({ data: [], total: 0 });
    mockRepo.searchList.mockResolvedValue({ data: [], total: 0 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessEventsService,
        { provide: AccessEventsRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<AccessEventsService>(AccessEventsService);
  });

  it("returns paginated meta with correct structure", async () => {
    const result = await service.list(
      { personType: "visitor", page: 1, pageSize: 25, locale: "en" as const },
      adminScope,
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
    await service.list({ personType: "visitor", page: 1, pageSize: 25, locale: "en" as const }, adminScope);

    const callArgs = mockRepo.list.mock.calls[0][0];
    expect(callArgs.dateFromUTC).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/);
    expect(callArgs.dateToUTC).toMatch(/^\d{4}-\d{2}-\d{2}T23:59:59\.999Z$/);
  });

  it("uses provided dateFrom and defaults dateTo to end of same day", async () => {
    await service.list(
      { personType: "visitor", page: 1, pageSize: 25, locale: "en" as const, dateFrom: "2026-04-01" },
      adminScope,
    );

    const callArgs = mockRepo.list.mock.calls[0][0];
    expect(callArgs.dateFromUTC).toBe("2026-04-01T00:00:00.000Z");
    expect(callArgs.dateToUTC).toBe("2026-04-01T23:59:59.999Z");
  });

  it("uses provided dateFrom and dateTo range", async () => {
    await service.list(
      { personType: "visitor", page: 1, pageSize: 25, locale: "en" as const, dateFrom: "2026-04-01", dateTo: "2026-04-22" },
      adminScope,
    );

    const callArgs = mockRepo.list.mock.calls[0][0];
    expect(callArgs.dateFromUTC).toBe("2026-04-01T00:00:00.000Z");
    expect(callArgs.dateToUTC).toBe("2026-04-22T23:59:59.999Z");
  });

  it("uses searchList when search is present and non-empty", async () => {
    await service.list(
      { personType: "visitor", page: 1, pageSize: 25, locale: "en" as const, search: "john" },
      adminScope,
    );

    expect(mockRepo.searchList).toHaveBeenCalledWith(
      expect.objectContaining({ search: "john" }),
      adminScope,
    );
    expect(mockRepo.list).not.toHaveBeenCalled();
  });

  it("uses list (not searchList) when search is absent", async () => {
    await service.list({ personType: "visitor", page: 1, pageSize: 25, locale: "en" as const }, adminScope);

    expect(mockRepo.list).toHaveBeenCalledTimes(1);
    expect(mockRepo.searchList).not.toHaveBeenCalled();
  });

  it("uses list (not searchList) when search is whitespace only", async () => {
    await service.list(
      { personType: "visitor", page: 1, pageSize: 25, locale: "en" as const, search: "   " },
      adminScope,
    );

    expect(mockRepo.list).toHaveBeenCalledTimes(1);
    expect(mockRepo.searchList).not.toHaveBeenCalled();
  });

  it("passes scope through to repo.list", async () => {
    await service.list({ personType: "visitor", page: 1, pageSize: 25, locale: "en" as const }, adminScope);

    expect(mockRepo.list).toHaveBeenCalledWith(expect.any(Object), adminScope);
  });

  it("super_admin scope passes through to repo", async () => {
    await service.list({ personType: "visitor", page: 1, pageSize: 25, locale: "en" as const }, superAdminScope);

    expect(mockRepo.list).toHaveBeenCalledWith(expect.any(Object), superAdminScope);
  });

  it("computes totalPages correctly for non-zero totals", async () => {
    mockRepo.list.mockResolvedValue({ data: new Array(10).fill({}), total: 47 });

    const result = await service.list(
      { personType: "visitor", page: 1, pageSize: 10, locale: "en" as const },
      adminScope,
    );

    expect(result.meta.totalPages).toBe(5);
  });

  it("totalPages is at least 1 even when total is 0", async () => {
    const result = await service.list(
      { personType: "visitor", page: 1, pageSize: 25, locale: "en" as const },
      adminScope,
    );

    expect(result.meta.totalPages).toBe(1);
  });

  it("passes residentId filter to repo.list", async () => {
    await service.list(
      { personType: "resident", page: 1, pageSize: 25, locale: "en" as const, residentId: "r42" },
      adminScope,
    );

    expect(mockRepo.list).toHaveBeenCalledWith(
      expect.objectContaining({ residentId: "r42" }),
      adminScope,
    );
  });
});
