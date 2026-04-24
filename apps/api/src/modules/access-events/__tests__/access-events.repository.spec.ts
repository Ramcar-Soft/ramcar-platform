import { Test, TestingModule } from "@nestjs/testing";
import { AccessEventsRepository } from "../access-events.repository";
import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import type { TenantScope } from "../../../common/utils/tenant-scope";

// ---------------------------------------------------------------------------
// Shared query-builder factory
// ---------------------------------------------------------------------------

function makeQueryBuilder(overrides: Partial<Record<string, jest.Mock>> = {}) {
  const qb: Record<string, jest.Mock> = {
    select: jest.fn(),
    eq: jest.fn(),
    in: jest.fn(),
    gte: jest.fn(),
    lte: jest.fn(),
    lt: jest.fn(),
    order: jest.fn(),
    range: jest.fn(),
    limit: jest.fn(),
    ...overrides,
  };

  // Each method returns `this` for chaining; range is the terminal call
  const chainable = ["select", "eq", "in", "gte", "lte", "lt", "order", "limit"];
  for (const method of chainable) {
    qb[method].mockReturnValue(qb);
  }

  // Terminal call resolves with empty data by default
  qb.range.mockResolvedValue({ data: [], error: null, count: 0 });

  return qb;
}

// Base filters used across most tests
const baseListFilters = {
  personType: "visitor",
  page: 1,
  pageSize: 25,
  dateFromUTC: "2026-04-22T00:00:00.000Z",
  dateToUTC: "2026-04-22T23:59:59.999Z",
};

const singleScope: TenantScope = { role: "resident", scope: "single", tenantId: "t1", tenantIds: ["t1"] };
const manyScope: TenantScope = { role: "admin", scope: "list", tenantId: "t1", tenantIds: ["t1", "t2"] };
const emptymanyScope: TenantScope = { role: "admin", scope: "list", tenantId: "", tenantIds: [] };

describe("AccessEventsRepository", () => {
  let repo: AccessEventsRepository;
  let mockClient: { from: jest.Mock; rpc: jest.Mock };
  let queryBuilder: ReturnType<typeof makeQueryBuilder>;

  beforeEach(async () => {
    queryBuilder = makeQueryBuilder();
    mockClient = {
      from: jest.fn().mockReturnValue(queryBuilder),
      rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessEventsRepository,
        {
          provide: SupabaseService,
          useValue: { getClient: () => mockClient },
        },
      ],
    }).compile();

    repo = module.get<AccessEventsRepository>(AccessEventsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // list() — scope-based tenant filtering
  // -------------------------------------------------------------------------

  describe("list()", () => {
    it("queries the access_events table", async () => {
      await repo.list(baseListFilters, singleScope);
      expect(mockClient.from).toHaveBeenCalledWith("access_events");
    });

    it("calls .eq('tenant_id', ...) for single scope", async () => {
      await repo.list(baseListFilters, singleScope);
      expect(queryBuilder.eq).toHaveBeenCalledWith("tenant_id", "t1");
    });

    it("calls .eq('tenant_id', tenantId) for many scope (active-tenant model uses tenantId not tenantIds)", async () => {
      await repo.list(baseListFilters, manyScope);
      // With the active-tenant header model, scope.tenantId is the validated active tenant.
      expect(queryBuilder.eq).toHaveBeenCalledWith("tenant_id", "t1");
    });

    it("does NOT call .in('tenant_id') for many scope (active-tenant model uses eq not in)", async () => {
      await repo.list(baseListFilters, manyScope);
      const tenantIdInCalls = queryBuilder.in.mock.calls.filter(
        ([col]: [string]) => col === "tenant_id",
      );
      expect(tenantIdInCalls).toHaveLength(0);
    });

    it("returns empty result immediately for many scope with empty tenantIds (no range call)", async () => {
      const result = await repo.list(baseListFilters, emptymanyScope);

      expect(result).toEqual({ data: [], total: 0 });
      // from() is called to build the query, but range() (terminal call) is never reached
      expect(queryBuilder.range).not.toHaveBeenCalled();
    });

    it("applies person_type filter via .eq()", async () => {
      await repo.list(baseListFilters, singleScope);
      expect(queryBuilder.eq).toHaveBeenCalledWith("person_type", "visitor");
    });

    it("applies dateFrom filter via .gte()", async () => {
      await repo.list(baseListFilters, singleScope);
      expect(queryBuilder.gte).toHaveBeenCalledWith(
        "created_at",
        baseListFilters.dateFromUTC,
      );
    });

    it("applies dateTo filter via .lte()", async () => {
      await repo.list(baseListFilters, singleScope);
      expect(queryBuilder.lte).toHaveBeenCalledWith(
        "created_at",
        baseListFilters.dateToUTC,
      );
    });

    it("applies pagination via .range()", async () => {
      await repo.list({ ...baseListFilters, page: 2, pageSize: 10 }, singleScope);
      // page 2, pageSize 10 → from=10, to=19
      expect(queryBuilder.range).toHaveBeenCalledWith(10, 19);
    });

    it("applies descending order by created_at", async () => {
      await repo.list(baseListFilters, singleScope);
      expect(queryBuilder.order).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
    });

    it("returns data and total from the query response", async () => {
      queryBuilder.range.mockResolvedValue({
        data: [],
        error: null,
        count: 42,
      });

      const result = await repo.list(baseListFilters, singleScope);
      expect(result.total).toBe(42);
    });

    it("applies residentId as user_id filter for resident personType", async () => {
      await repo.list(
        { ...baseListFilters, personType: "resident", residentId: "r1" },
        singleScope,
      );
      expect(queryBuilder.eq).toHaveBeenCalledWith("user_id", "r1");
    });

    it("throws when query returns an error", async () => {
      queryBuilder.range.mockResolvedValue({
        data: null,
        error: new Error("DB error"),
        count: null,
      });

      await expect(repo.list(baseListFilters, singleScope)).rejects.toThrow(
        "DB error",
      );
    });
  });

  // -------------------------------------------------------------------------
  // searchList() — RPC call
  // -------------------------------------------------------------------------

  describe("searchList()", () => {
    const searchFilters = { ...baseListFilters, search: "john" };

    it("calls rpc('search_access_events') with correct params for single scope", async () => {
      await repo.searchList(searchFilters, singleScope);

      expect(mockClient.rpc).toHaveBeenCalledWith(
        "search_access_events",
        expect.objectContaining({
          p_search: "john",
          p_tenant_ids: ["t1"],
          p_person_type: "visitor",
          p_date_from: baseListFilters.dateFromUTC,
          p_date_to_exclusive: baseListFilters.dateToUTC,
        }),
      );
    });

    it("calls rpc('search_access_events') with correct params for many scope (uses tenantId only)", async () => {
      await repo.searchList(searchFilters, manyScope);

      expect(mockClient.rpc).toHaveBeenCalledWith(
        "search_access_events",
        expect.objectContaining({
          p_tenant_ids: ["t1"], // Active-tenant model: only the active tenant, not all tenantIds
        }),
      );
    });

    it("passes correct pagination params to rpc", async () => {
      await repo.searchList(
        { ...searchFilters, page: 3, pageSize: 10 },
        singleScope,
      );

      expect(mockClient.rpc).toHaveBeenCalledWith(
        "search_access_events",
        expect.objectContaining({
          p_limit: 10,
          p_offset: 20, // (3-1)*10
        }),
      );
    });

    it("passes p_resident_id as null when not provided", async () => {
      await repo.searchList(searchFilters, singleScope);

      expect(mockClient.rpc).toHaveBeenCalledWith(
        "search_access_events",
        expect.objectContaining({ p_resident_id: null }),
      );
    });

    it("passes p_resident_id when residentId is provided", async () => {
      await repo.searchList(
        { ...searchFilters, residentId: "r1" },
        singleScope,
      );

      expect(mockClient.rpc).toHaveBeenCalledWith(
        "search_access_events",
        expect.objectContaining({ p_resident_id: "r1" }),
      );
    });

    it("returns empty result when rpc returns no rows", async () => {
      mockClient.rpc.mockResolvedValue({ data: [], error: null });

      const result = await repo.searchList(searchFilters, singleScope);
      expect(result).toEqual({ data: [], total: 0 });
    });

    it("throws when rpc returns an error", async () => {
      mockClient.rpc.mockResolvedValue({
        data: null,
        error: new Error("RPC error"),
      });

      await expect(
        repo.searchList(searchFilters, singleScope),
      ).rejects.toThrow("RPC error");
    });

    it("extracts total_count from first RPC row", async () => {
      const rpcRow = {
        id: "ev1",
        tenant_id: "t1",
        tenant_name: "Tenant 1",
        person_type: "visitor",
        direction: "in",
        access_mode: "pedestrian",
        notes: null,
        created_at: "2026-04-22T10:00:00Z",
        visit_person_id: null,
        user_id: null,
        vp_code: null,
        vp_full_name: null,
        vp_phone: null,
        vp_company: null,
        vp_status: null,
        vp_resident_id: null,
        vp_resident_full_name: null,
        res_full_name: null,
        res_address: null,
        vehicle_id: null,
        vehicle_plate: null,
        vehicle_brand: null,
        vehicle_model: null,
        registered_by: "guard-1",
        guard_full_name: "Guard One",
        total_count: "7",
      };

      mockClient.rpc.mockResolvedValue({ data: [rpcRow], error: null });

      const result = await repo.searchList(searchFilters, singleScope);
      expect(result.total).toBe(7);
      expect(result.data).toHaveLength(1);
    });
  });
});
