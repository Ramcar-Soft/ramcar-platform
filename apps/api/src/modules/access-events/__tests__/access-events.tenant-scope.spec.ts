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

describe("AccessEventsService — tenant scoping (T015)", () => {
  let service: AccessEventsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRepo.list.mockResolvedValue({ data: [], total: 0 });
    mockRepo.create.mockResolvedValue({
      id: "evt-1",
      event_id: "ev-1",
      tenant_id: TENANT_A,
      person_type: "visitor",
      user_id: null,
      visit_person_id: "vp-1",
      direction: "entry",
      access_mode: "pedestrian",
      vehicle_id: null,
      registered_by: "guard-1",
      notes: null,
      source: "desktop",
      created_at: new Date().toISOString(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessEventsService,
        { provide: AccessEventsRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<AccessEventsService>(AccessEventsService);
  });

  it("POST stamps scope.tenantId onto the row regardless of request body", async () => {
    await service.create(
      {
        eventId: "ev-1",
        personType: "visitor",
        visitPersonId: "vp-1",
        direction: "entry",
        accessMode: "pedestrian",
        source: "desktop",
      },
      scopeA,
      "guard-profile-1",
    );

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.anything(),
      TENANT_A, // scope.tenantId, not from body
      "guard-profile-1",
    );
  });

  it("GET list filters by scope.tenantId", async () => {
    await service.list(
      { personType: "visitor", page: 1, pageSize: 25, locale: "en" as const },
      scopeA,
    );

    expect(mockRepo.list).toHaveBeenCalledWith(
      expect.anything(),
      scopeA,
    );
  });

  it("two sessions with different scopes produce independent repo calls", async () => {
    await service.list(
      { personType: "visitor", page: 1, pageSize: 25, locale: "en" as const },
      scopeA,
    );
    await service.list(
      { personType: "visitor", page: 1, pageSize: 25, locale: "en" as const },
      scopeB,
    );

    const firstCall = mockRepo.list.mock.calls[0][1] as TenantScope;
    const secondCall = mockRepo.list.mock.calls[1][1] as TenantScope;

    expect(firstCall.tenantId).toBe(TENANT_A);
    expect(secondCall.tenantId).toBe(TENANT_B);
  });
});
