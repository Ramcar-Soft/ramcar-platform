/**
 * VisitPersonsService enrichment — list() returns residentAddress + vehiclePlates.
 *
 * Covers fetchVehiclePlates (no plates / single plate / multiple plates) and the
 * resident-address join (resident with address, resident without address).
 */
import { Test } from "@nestjs/testing";
import { VisitPersonsService } from "../visit-persons.service";
import { VisitPersonsRepository } from "../visit-persons.repository";
import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import type { TenantScope } from "../../../common/utils/tenant-scope";

const TENANT_A = "00000000-0000-0000-0000-000000000001";
const RESIDENT_WITH_ADDR = "11111111-1111-1111-1111-111111111111";
const RESIDENT_NO_ADDR = "22222222-2222-2222-2222-222222222222";
const VP_NO_VEHICLES = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const VP_ONE_VEHICLE = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const VP_TWO_VEHICLES = "cccccccc-cccc-cccc-cccc-cccccccccccc";

const scopeA: TenantScope = {
  role: "admin",
  scope: "list",
  tenantId: TENANT_A,
  tenantIds: [TENANT_A],
};

function row(id: string, residentId: string | null, overrides: Record<string, unknown> = {}) {
  return {
    id,
    tenant_id: TENANT_A,
    code: `VP-${id.slice(0, 4)}`,
    type: "visitor",
    status: "allowed",
    full_name: "Tester",
    phone: null,
    company: null,
    resident_id: residentId,
    notes: null,
    registered_by: "guard-1",
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

/**
 * Mock supabase that routes `from("profiles")` and `from("vehicles")` to two
 * different stub query builders.
 */
function makeSupabaseStub({
  profiles,
  vehicles,
}: {
  profiles: Array<{ id: string; full_name: string; address: string | null }>;
  vehicles: Array<{ visit_person_id: string; plate: string }>;
}) {
  return {
    getClient: () => ({
      from: (table: string) => {
        if (table === "profiles") {
          return {
            select: () => ({
              in: (_col: string, ids: string[]) => Promise.resolve({
                data: profiles.filter((p) => ids.includes(p.id)),
                error: null,
              }),
            }),
          };
        }
        if (table === "vehicles") {
          let filteredIds: string[] = [];
          const builder = {
            select: () => builder,
            eq: () => builder,
            in: (_col: string, ids: string[]) => {
              filteredIds = ids;
              return builder;
            },
            is: () => builder,
            not: () => builder,
            order: () => Promise.resolve({
              data: vehicles.filter((v) => filteredIds.includes(v.visit_person_id)),
              error: null,
            }),
          };
          return builder;
        }
        throw new Error(`unexpected table: ${table}`);
      },
    }),
  };
}

describe("VisitPersonsService enrichment", () => {
  function make(serviceSupabase: ReturnType<typeof makeSupabaseStub>) {
    jest.clearAllMocks();
    return Test.createTestingModule({
      providers: [
        VisitPersonsService,
        { provide: VisitPersonsRepository, useValue: mockRepository },
        { provide: SupabaseService, useValue: serviceSupabase },
      ],
    })
      .compile()
      .then((m) => m.get<VisitPersonsService>(VisitPersonsService));
  }

  const filters = {
    page: 1,
    pageSize: 10,
    sortBy: "created_at" as const,
    sortOrder: "desc" as const,
  };

  it("returns residentAddress from profile join (with address and null address)", async () => {
    const supa = makeSupabaseStub({
      profiles: [
        { id: RESIDENT_WITH_ADDR, full_name: "Res One", address: "100 Main St" },
        { id: RESIDENT_NO_ADDR, full_name: "Res Two", address: null },
      ],
      vehicles: [],
    });
    const service = await make(supa);
    mockRepository.list.mockResolvedValue({
      data: [
        row(VP_NO_VEHICLES, RESIDENT_WITH_ADDR),
        row(VP_ONE_VEHICLE, RESIDENT_NO_ADDR),
      ],
      count: 2,
    });

    const result = await service.list(filters, scopeA);

    expect(result.data[0]).toMatchObject({
      id: VP_NO_VEHICLES,
      residentName: "Res One",
      residentAddress: "100 Main St",
    });
    expect(result.data[1]).toMatchObject({
      id: VP_ONE_VEHICLE,
      residentName: "Res Two",
      residentAddress: null,
    });
  });

  it("returns empty vehiclePlates array for visit-persons with no vehicles", async () => {
    const supa = makeSupabaseStub({
      profiles: [{ id: RESIDENT_WITH_ADDR, full_name: "Res One", address: null }],
      vehicles: [],
    });
    const service = await make(supa);
    mockRepository.list.mockResolvedValue({
      data: [row(VP_NO_VEHICLES, RESIDENT_WITH_ADDR)],
      count: 1,
    });

    const result = await service.list(filters, scopeA);

    expect(result.data[0].vehiclePlates).toEqual([]);
  });

  it("returns single plate for a visit-person with one vehicle", async () => {
    const supa = makeSupabaseStub({
      profiles: [{ id: RESIDENT_WITH_ADDR, full_name: "Res One", address: null }],
      vehicles: [{ visit_person_id: VP_ONE_VEHICLE, plate: "ABC-123" }],
    });
    const service = await make(supa);
    mockRepository.list.mockResolvedValue({
      data: [row(VP_ONE_VEHICLE, RESIDENT_WITH_ADDR)],
      count: 1,
    });

    const result = await service.list(filters, scopeA);

    expect(result.data[0].vehiclePlates).toEqual(["ABC-123"]);
  });

  it("returns multiple plates in insertion order for a visit-person with several vehicles", async () => {
    const supa = makeSupabaseStub({
      profiles: [{ id: RESIDENT_WITH_ADDR, full_name: "Res One", address: null }],
      vehicles: [
        { visit_person_id: VP_TWO_VEHICLES, plate: "AAA-111" },
        { visit_person_id: VP_TWO_VEHICLES, plate: "BBB-222" },
      ],
    });
    const service = await make(supa);
    mockRepository.list.mockResolvedValue({
      data: [row(VP_TWO_VEHICLES, RESIDENT_WITH_ADDR)],
      count: 1,
    });

    const result = await service.list(filters, scopeA);

    expect(result.data[0].vehiclePlates).toEqual(["AAA-111", "BBB-222"]);
  });

  it("does not call the vehicles or profiles tables when the page is empty", async () => {
    const fromSpy = jest.fn();
    const supa = {
      getClient: () => ({ from: fromSpy }),
    };
    const service = await make(supa as ReturnType<typeof makeSupabaseStub>);
    mockRepository.list.mockResolvedValue({ data: [], count: 0 });

    await service.list(filters, scopeA);

    expect(fromSpy).not.toHaveBeenCalled();
  });
});
