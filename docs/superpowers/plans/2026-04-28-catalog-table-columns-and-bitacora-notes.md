# Catalog table columns + Bitácora notes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add resident-address + vehicle-plates columns to the Visitors and Providers catalogs, and add a notes column to all three Bitácora tabs (with truncated-with-tooltip behavior and a CSV-export update).

**Architecture:** No schema changes, no new endpoints. Extend the existing `GET /visit-persons` server-side enrichment to batch-fetch resident addresses + visit-person vehicle plates and merge them into the page response. The Bitácora notes data already ships from `search_access_events`; only the UI binds it. CSV export is built server-side in `apps/api/src/modules/access-events/access-events.csv.ts` (the spec called this out as a client hook — that was wrong; this plan corrects it).

**Tech Stack:** TypeScript strict; NestJS v11 (Jest tests); Next.js 16 / React 18 + Vitest tests in `apps/web` and `packages/features`; shadcn/ui (`Badge`, `Tooltip`); Supabase JS v2; next-intl v4 (web) / react-i18next (desktop); shared i18n catalog under `packages/i18n`.

**Spec corrections captured in this plan:**

1. **CSV builder is server-side.** The spec said "edit `apps/web/src/features/logbook/hooks/use-logbook-export.ts`" — that hook only triggers a download. The actual CSV row builder is `apps/api/src/modules/access-events/access-events.csv.ts` `itemToRow` (three branches: visitors / providers / residents). The plan edits that file plus the existing Jest spec `access-events.csv.spec.ts`.
2. **shared-features risk does not apply.** The spec flagged that `pnpm check:shared-features` could trip on a new `packages/features/src/shared/plates-cell.tsx`. The script (`scripts/check-shared-features.ts`) scans only `apps/{web,desktop}/src/features/<migrated-feature>/` — new files under `packages/features/src/shared/` are not gated. No allowList entry is needed; the plan still re-runs the check as a build gate.

---

## File map

**API (NestJS, Jest):**
- Modify: `apps/api/src/modules/visit-persons/visit-persons.service.ts` — rename `fetchResidentNames` → `fetchResidentDisplayInfo`, rename `enrichWithResidentName` → `enrichWithResidentDisplay`, add `fetchVehiclePlates`, wire `list()` to merge both.
- Create: `apps/api/src/modules/visit-persons/__tests__/visit-persons.enrichment.spec.ts` — covers list-time enrichment of `residentAddress` + `vehiclePlates` (no/single/multi vehicle cases).
- Modify: `apps/api/src/modules/access-events/access-events.csv.ts` — `itemToRow`: insert `item.notes ?? ""` between "Registered by" and "Date" in all three branches.
- Modify: `apps/api/src/modules/access-events/__tests__/access-events.csv.spec.ts` — extend to cover the new column for all three subpages.

**Shared types (typecheck-only):**
- Modify: `packages/shared/src/types/visit-person.ts` — add `residentAddress?: string | null` and `vehiclePlates?: string[]` to `VisitPerson`.
- Modify: `packages/shared/src/types/access-event.ts` — `LOGBOOK_CSV_LABELS`: insert `"Notes"` / `"Notas"` between "Registered by" / "Registrado por" and "Date" / "Fecha" in all three subpages for both locales.

**Shared UI primitives (`packages/features`, Vitest):**
- Create: `packages/features/src/shared/plates-cell.tsx` — `PlatesCell` component (first plate + `+N` badge).
- Modify: `packages/features/src/shared/index.ts` — export `PlatesCell`.
- Create: `packages/features/src/shared/__tests__/plates-cell.test.tsx` — empty / single / multiple cases.

**Visitors catalog (shared package, Vitest):**
- Modify: `packages/features/src/visitors/components/visitors-table-columns.tsx` — insert `residentAddress` and `plates` columns between `resident_name` and `actions`.
- Modify: `packages/features/src/visitors/__tests__/visitors-table.test.tsx` — assert the new headers and a row populated with `residentAddress` + `vehiclePlates`.

**Providers catalog (per-app, no Vitest tests — see spec "Skipped (deliberate)"):**
- Modify: `apps/web/src/features/providers/components/providers-table-columns.tsx` — insert `residentAddress` and `plates` columns between `status` and `actions`.
- Modify: `apps/desktop/src/features/providers/components/providers-table-columns.tsx` — identical insertion.

**Bitácora (apps/web, Vitest):**
- Create: `apps/web/src/features/logbook/components/notes-cell.tsx` — `NotesCell` truncate-with-tooltip helper.
- Create: `apps/web/src/features/logbook/__tests__/notes-cell.test.tsx` — null / short / long cases.
- Modify: `apps/web/src/features/logbook/components/visitors-columns.tsx` — insert `notes` column immediately before `date`.
- Modify: `apps/web/src/features/logbook/components/providers-columns.tsx` — same.
- Modify: `apps/web/src/features/logbook/components/residents-columns.tsx` — same.
- Modify: `apps/web/src/features/logbook/__tests__/logbook-table.test.tsx` — assert `notes` column header renders and a row with `notes` shows the cell.

**i18n catalogs:**
- Modify: `packages/i18n/src/messages/es.json` — `visitPersons.columns.residentAddress = "Dirección"`, `visitPersons.columns.plates = "Placas"`; `providers.columns.residentAddress`, `providers.columns.plates`; `logbook.columns.notes = "Notas"`.
- Modify: `packages/i18n/src/messages/en.json` — same keys, English values.

---

## Task ordering

The plan walks bottom-up: shared types → API → shared UI → visitor columns → provider columns (web + desktop) → Bitácora cell + columns → CSV labels + builder → final build gates. Each task is a TDD red-green-commit cycle and ends with a `git commit`. Frequent commits.

---

### Task 1: Extend `VisitPerson` shared type with `residentAddress` and `vehiclePlates`

**Files:**
- Modify: `packages/shared/src/types/visit-person.ts`

- [ ] **Step 1: Open the file and confirm current shape**

Run: `git diff packages/shared/src/types/visit-person.ts` (should be clean before starting)

- [ ] **Step 2: Add the two optional fields**

Edit `packages/shared/src/types/visit-person.ts`. Replace:

```ts
export interface VisitPerson {
  id: string;
  tenantId: string;
  code: string;
  type: VisitPersonType;
  status: VisitPersonStatus;
  fullName: string;
  phone: string | null;
  company: string | null;
  residentId: string | null;
  residentName?: string;
  notes: string | null;
  registeredBy: string;
  createdAt: string;
  updatedAt: string;
}
```

with:

```ts
export interface VisitPerson {
  id: string;
  tenantId: string;
  code: string;
  type: VisitPersonType;
  status: VisitPersonStatus;
  fullName: string;
  phone: string | null;
  company: string | null;
  residentId: string | null;
  residentName?: string;
  residentAddress?: string | null;
  vehiclePlates?: string[];
  notes: string | null;
  registeredBy: string;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 3: Verify the package still typechecks**

Run: `pnpm --filter @ramcar/shared typecheck`
Expected: PASS (the new fields are optional, so no consumers break).

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types/visit-person.ts
git commit -m "feat(shared): add residentAddress and vehiclePlates to VisitPerson"
```

---

### Task 2: API — rename `fetchResidentNames` → `fetchResidentDisplayInfo` and update single-row paths

**Files:**
- Modify: `apps/api/src/modules/visit-persons/visit-persons.service.ts`
- Test (existing, update if necessary): `apps/api/src/modules/visit-persons/__tests__/visit-persons.tenant-scope.spec.ts`

The rename keeps every existing public behavior identical and merely returns `{ fullName, address }` per resident instead of just the name. `findById`, `create`, and `update` consume the renamed helper unchanged in semantics; the only difference is the merged `residentAddress` field on the returned `VisitPerson`.

- [ ] **Step 1: Update the service to the new shape**

Edit `apps/api/src/modules/visit-persons/visit-persons.service.ts`. Apply this full diff (showing only the changed regions; preserve every other line):

```ts
  async create(
    dto: CreateVisitPersonDto,
    scope: TenantScope,
    registeredBy: string,
    role: Role | undefined,
  ): Promise<VisitPerson> {
    const tenantId = scopeToTenantId(scope);
    const safeDto: CreateVisitPersonDto =
      role === "admin" || role === "super_admin" ? dto : { ...dto, status: "flagged" };
    const row = await this.repository.create(safeDto, tenantId, registeredBy);
    return this.enrichWithResidentDisplay(this.mapRow(row));
  }

  async findById(id: string, scope: TenantScope): Promise<VisitPerson> {
    const row = await this.repository.findById(id, scope);
    if (!row) throw new NotFoundException("Visit person not found");
    return this.enrichWithResidentDisplay(this.mapRow(row));
  }

  // …list() rewritten in Task 4…

  async update(
    id: string,
    dto: UpdateVisitPersonDto,
    scope: TenantScope,
    role: Role | undefined,
  ): Promise<VisitPerson> {
    if (role !== "admin" && role !== "super_admin" && dto.status !== undefined) {
      throw new ForbiddenException("Guards cannot change visit-person status");
    }
    const row = await this.repository.update(id, dto, scope);
    if (!row) throw new NotFoundException("Visit person not found");
    return this.enrichWithResidentDisplay(this.mapRow(row));
  }

  // …mapRow unchanged…

  private async enrichWithResidentDisplay(person: VisitPerson): Promise<VisitPerson> {
    if (!person.residentId) return person;
    const info = await this.fetchResidentDisplayInfo([person.residentId]);
    const entry = info.get(person.residentId);
    return {
      ...person,
      residentName: entry?.fullName,
      residentAddress: entry?.address ?? null,
    };
  }

  private async fetchResidentDisplayInfo(
    residentIds: string[],
  ): Promise<Map<string, { fullName: string; address: string | null }>> {
    if (residentIds.length === 0) return new Map();

    const uniqueIds = [...new Set(residentIds)];
    const { data } = await this.supabase
      .getClient()
      .from("profiles")
      .select("id, full_name, address")
      .in("id", uniqueIds);

    const map = new Map<string, { fullName: string; address: string | null }>();
    for (const row of data ?? []) {
      map.set(row.id as string, {
        fullName: row.full_name as string,
        address: (row.address as string | null) ?? null,
      });
    }
    return map;
  }
```

Note: `list()` is intentionally left in its current state for this task; Task 4 rewrites it. After this edit the file will not compile because `list()` still calls the old `fetchResidentNames` — that's fine, this task ends after we fix that compile error in Step 3.

- [ ] **Step 2: Bridge `list()` to compile against the renamed helper**

Inside `list()`, replace the existing block:

```ts
    const residentNameMap = await this.fetchResidentNames(residentIds);

    const enriched = persons.map((p) => ({
      ...p,
      residentName: p.residentId
        ? residentNameMap.get(p.residentId) ?? undefined
        : undefined,
    }));
```

with the temporary equivalent below (Task 4 will rewrite this entirely):

```ts
    const residentInfoMap = await this.fetchResidentDisplayInfo(residentIds);

    const enriched = persons.map((p) => {
      if (!p.residentId) return p;
      const info = residentInfoMap.get(p.residentId);
      return {
        ...p,
        residentName: info?.fullName,
        residentAddress: info?.address ?? null,
      };
    });
```

- [ ] **Step 3: Verify the API typechecks and the existing tenant-scope spec still passes**

Run: `pnpm --filter @ramcar/api typecheck`
Expected: PASS.

Run: `pnpm --filter @ramcar/api test -- visit-persons`
Expected: PASS — the existing `visit-persons.tenant-scope.spec.ts` and `visit-persons.role-rules.spec.ts` are independent of the rename. The mock supabase service in the existing spec already exposes `from(...).select(...).in(...) → { data: [], error: null }`, which works for both the old and new `select` arguments.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/visit-persons/visit-persons.service.ts
git commit -m "refactor(api/visit-persons): rename resident-name helper to display-info"
```

---

### Task 3: API — add `fetchVehiclePlates` (TDD)

**Files:**
- Modify: `apps/api/src/modules/visit-persons/visit-persons.service.ts`
- Create: `apps/api/src/modules/visit-persons/__tests__/visit-persons.enrichment.spec.ts`

This task introduces the helper. Task 4 wires it into `list()`.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/modules/visit-persons/__tests__/visit-persons.enrichment.spec.ts`:

```ts
/**
 * VisitPersonsService enrichment — list() returns residentAddress + vehiclePlates.
 *
 * Covers fetchVehiclePlates (no plates / single plate / multiple plates) and the
 * resident-address join (resident with address, resident without address).
 */
import { Test, TestingModule } from "@nestjs/testing";
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
 * different stub query builders. Both honor the chained `.select(...).eq(...).is(...).in(...).order(...)`
 * surface used by the service.
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
          // chain: .select("visit_person_id, plate").eq(tenant).in(visit_person_id, ids).is("deleted_at", null).not("plate", "is", null).order(...)
          // Capture the in() ids and resolve at the end of the chain.
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
```

- [ ] **Step 2: Run the new test and confirm it fails**

Run: `pnpm --filter @ramcar/api test -- visit-persons.enrichment`
Expected: FAIL — at minimum because `fetchVehiclePlates` does not yet exist and `list()` does not include `vehiclePlates` on returned rows.

- [ ] **Step 3: Add `fetchVehiclePlates` to the service**

Edit `apps/api/src/modules/visit-persons/visit-persons.service.ts`. Add this method below `fetchResidentDisplayInfo`:

```ts
  private async fetchVehiclePlates(
    visitPersonIds: string[],
    scope: TenantScope,
  ): Promise<Map<string, string[]>> {
    if (visitPersonIds.length === 0) return new Map();

    const uniqueIds = [...new Set(visitPersonIds)];
    let query = this.supabase
      .getClient()
      .from("vehicles")
      .select("visit_person_id, plate");

    if (scope.scope !== "all") {
      query = query.eq("tenant_id", scope.tenantId) as typeof query;
    }

    const { data, error } = await query
      .in("visit_person_id", uniqueIds)
      .is("deleted_at", null)
      .not("plate", "is", null)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const map = new Map<string, string[]>();
    for (const row of data ?? []) {
      const id = row.visit_person_id as string;
      const plate = row.plate as string;
      const existing = map.get(id);
      if (existing) existing.push(plate);
      else map.set(id, [plate]);
    }
    return map;
  }
```

Notes:
- Why inline the tenant filter instead of `applyTenantScope`? The util's signature `<Q extends { eq; in }>` is fine here, but the surface we need (`.eq().in().is().not().order()`) is already chained inline elsewhere in this codebase (see `vehicles.repository.ts:findByVisitPersonId`). Inline keeps the chain readable and matches the surrounding style.
- `.not("plate", "is", null)` excludes vehicles with `plate IS NULL` — those exist (the column is nullable per `vehicles.repository.ts:create`).
- `deleted_at IS NULL` mirrors the soft-delete migration `20260428000000_vehicles_soft_delete.sql`.

- [ ] **Step 4: Hold off committing**

The new test exercises `service.list()` end-to-end and will not turn green until Task 4 rewrites `list()` to merge the plates and the resident-display map. Leave both files staged in the working tree but do not commit yet — Task 4 will commit them together.

Run (sanity): `pnpm --filter @ramcar/api typecheck`
Expected: PASS — adding the private helper does not break compilation.

---

### Task 4: API — wire `list()` to merge address and plates

**Files:**
- Modify: `apps/api/src/modules/visit-persons/visit-persons.service.ts`

- [ ] **Step 1: Replace the `list()` method body**

In `apps/api/src/modules/visit-persons/visit-persons.service.ts`, replace the entire body of `list(filters, scope)` (between the existing destructuring and the `return` statement) with:

```ts
    const { data, count } = await this.repository.list(filters, scope);
    const persons = data.map((row) => this.mapRow(row));

    if (persons.length === 0) {
      return {
        data: [],
        meta: {
          page: filters.page,
          pageSize: filters.pageSize,
          total: count,
          totalPages: Math.ceil(count / filters.pageSize),
        },
      };
    }

    const residentIds = persons
      .map((p) => p.residentId)
      .filter((id): id is string => !!id);
    const personIds = persons.map((p) => p.id);

    const [residentInfoMap, platesMap] = await Promise.all([
      this.fetchResidentDisplayInfo(residentIds),
      this.fetchVehiclePlates(personIds, scope),
    ]);

    const enriched = persons.map((p) => {
      const residentInfo = p.residentId ? residentInfoMap.get(p.residentId) : undefined;
      return {
        ...p,
        residentName: residentInfo?.fullName,
        residentAddress: residentInfo?.address ?? null,
        vehiclePlates: platesMap.get(p.id) ?? [],
      };
    });

    return {
      data: enriched,
      meta: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count,
        totalPages: Math.ceil(count / filters.pageSize),
      },
    };
```

The early-return when `persons.length === 0` matches the assertion `it("does not call the vehicles or profiles tables when the page is empty")` in the spec from Task 3.

- [ ] **Step 2: Run the enrichment spec and confirm green**

Run: `pnpm --filter @ramcar/api test -- visit-persons.enrichment`
Expected: PASS — all five assertions.

- [ ] **Step 3: Run the full visit-persons module suite to catch regressions**

Run: `pnpm --filter @ramcar/api test -- visit-persons`
Expected: PASS — including `visit-persons.tenant-scope.spec.ts` and `visit-persons.role-rules.spec.ts`.

- [ ] **Step 4: Commit (bundled with Task 3's pending changes)**

```bash
git add apps/api/src/modules/visit-persons/visit-persons.service.ts apps/api/src/modules/visit-persons/__tests__/visit-persons.enrichment.spec.ts
git commit -m "feat(api/visit-persons): merge resident address and vehicle plates into list()"
```

---

### Task 5: PlatesCell shared component (TDD)

**Files:**
- Create: `packages/features/src/shared/plates-cell.tsx`
- Create: `packages/features/src/shared/__tests__/plates-cell.test.tsx`
- Modify: `packages/features/src/shared/index.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/features/src/shared/__tests__/plates-cell.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlatesCell } from "../plates-cell";

describe("PlatesCell", () => {
  it("renders an em-dash when plates is undefined", () => {
    render(<PlatesCell plates={undefined} />);
    expect(screen.getByText("—")).toBeDefined();
  });

  it("renders an em-dash when plates is empty", () => {
    render(<PlatesCell plates={[]} />);
    expect(screen.getByText("—")).toBeDefined();
  });

  it("renders a single plate without a badge", () => {
    render(<PlatesCell plates={["ABC-123"]} />);
    expect(screen.getByText("ABC-123")).toBeDefined();
    expect(screen.queryByText(/^\+\d+$/)).toBeNull();
  });

  it("renders the first plate with a +N badge when multiple plates exist", () => {
    render(<PlatesCell plates={["ABC-123", "DEF-456", "GHI-789"]} />);
    expect(screen.getByText("ABC-123")).toBeDefined();
    expect(screen.getByText("+2")).toBeDefined();
    expect(screen.queryByText("DEF-456")).toBeNull();
    expect(screen.queryByText("GHI-789")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm --filter @ramcar/features test -- plates-cell`
Expected: FAIL — module `../plates-cell` not found.

- [ ] **Step 3: Implement the component**

Create `packages/features/src/shared/plates-cell.tsx`:

```tsx
import { Badge } from "@ramcar/ui";

interface PlatesCellProps {
  plates?: string[];
}

export function PlatesCell({ plates }: PlatesCellProps) {
  if (!plates || plates.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  const [first, ...rest] = plates;
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-xs">{first}</span>
      {rest.length > 0 && (
        <Badge variant="secondary" className="h-5 px-1.5 text-xs font-normal">
          +{rest.length}
        </Badge>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Re-export from the shared barrel**

Edit `packages/features/src/shared/index.ts`. Add at the end of the existing file:

```ts
export { PlatesCell } from "./plates-cell";
```

- [ ] **Step 5: Run the test again and confirm it passes**

Run: `pnpm --filter @ramcar/features test -- plates-cell`
Expected: PASS — all four assertions.

- [ ] **Step 6: Confirm the package typechecks**

Run: `pnpm --filter @ramcar/features typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/features/src/shared/plates-cell.tsx packages/features/src/shared/__tests__/plates-cell.test.tsx packages/features/src/shared/index.ts
git commit -m "feat(features/shared): add PlatesCell — first plate plus +N badge"
```

---

### Task 6: Visitors catalog — add `residentAddress` and `plates` columns

**Files:**
- Modify: `packages/features/src/visitors/components/visitors-table-columns.tsx`
- Modify: `packages/features/src/visitors/__tests__/visitors-table.test.tsx`

- [ ] **Step 1: Extend the existing test to assert the new columns and a populated row**

Edit `packages/features/src/visitors/__tests__/visitors-table.test.tsx`. Replace the `mockPerson` block and the existing `it("renders person data", …)` test body with:

```ts
const mockPerson: VisitPerson = {
  id: "person-1",
  tenantId: "t1",
  type: "visitor",
  code: "V001",
  fullName: "María García",
  status: "allowed",
  phone: null,
  company: null,
  residentId: "res-1",
  residentName: "Roberto Residente",
  residentAddress: "Calle Falsa 123",
  vehiclePlates: ["ABC-123", "DEF-456"],
  notes: null,
  registeredBy: "user-1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
```

And add (alongside the existing `it` blocks) two new assertions:

```ts
  it("renders the resident address column", () => {
    renderWithHarness(<VisitorsTable {...defaultProps} />);
    expect(screen.getByText("Calle Falsa 123")).toBeDefined();
  });

  it("renders the plates column with the first plate and a +1 badge", () => {
    renderWithHarness(<VisitorsTable {...defaultProps} />);
    expect(screen.getByText("ABC-123")).toBeDefined();
    expect(screen.getByText("+1")).toBeDefined();
  });
```

- [ ] **Step 2: Run the test and confirm the new assertions fail**

Run: `pnpm --filter @ramcar/features test -- visitors-table`
Expected: FAIL — "Calle Falsa 123" and "+1" are not present in the rendered output.

- [ ] **Step 3: Implement the columns**

Edit `packages/features/src/visitors/components/visitors-table-columns.tsx`. Replace the entire file body with:

```tsx
import { Button } from "@ramcar/ui";
import { Pencil } from "lucide-react";
import type { VisitPerson } from "../types";
import { VisitPersonStatusBadge } from "./visit-person-status-badge";
import { PlatesCell } from "../../shared/plates-cell";

interface ColumnDef {
  key: string;
  header: string;
  render: (person: VisitPerson) => React.ReactNode;
}

interface GetVisitorColumnsOptions {
  onEditPerson?: (person: VisitPerson) => void;
  editLabel?: string;
}

export function getVisitorColumns(
  t: (key: string) => string,
  options: GetVisitorColumnsOptions = {},
): ColumnDef[] {
  const columns: ColumnDef[] = [
    {
      key: "code",
      header: t("visitPersons.columns.code"),
      render: (p) => <span className="font-mono text-xs">{p.code}</span>,
    },
    {
      key: "full_name",
      header: t("visitPersons.columns.fullName"),
      render: (p) => <span className="font-medium">{p.fullName}</span>,
    },
    {
      key: "status",
      header: t("visitPersons.columns.status"),
      render: (p) => <VisitPersonStatusBadge status={p.status} />,
    },
    {
      key: "resident_name",
      header: t("visitPersons.columns.residentName"),
      render: (p) => p.residentName ?? "—",
    },
    {
      key: "resident_address",
      header: t("visitPersons.columns.residentAddress"),
      render: (p) => (
        <span className="text-sm">{p.residentAddress ?? "—"}</span>
      ),
    },
    {
      key: "plates",
      header: t("visitPersons.columns.plates"),
      render: (p) => <PlatesCell plates={p.vehiclePlates} />,
    },
  ];

  if (options.onEditPerson) {
    columns.push({
      key: "actions",
      header: t("visitPersons.columns.edit"),
      render: (p) => (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={options.editLabel}
            onClick={(e) => {
              e.stopPropagation();
              options.onEditPerson?.(p);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      ),
    });
  }

  return columns;
}
```

- [ ] **Step 4: Run the visitors test suite and confirm green**

Run: `pnpm --filter @ramcar/features test -- visitors-table`
Expected: PASS — both new assertions and all existing assertions.

- [ ] **Step 5: Commit**

```bash
git add packages/features/src/visitors/components/visitors-table-columns.tsx packages/features/src/visitors/__tests__/visitors-table.test.tsx
git commit -m "feat(features/visitors): add resident address and plates columns"
```

---

### Task 7: Visitors + Providers i18n keys (ES + EN)

**Files:**
- Modify: `packages/i18n/src/messages/es.json`
- Modify: `packages/i18n/src/messages/en.json`

- [ ] **Step 1: Add ES keys**

Edit `packages/i18n/src/messages/es.json`. In the `visitPersons.columns` block (currently `"code", "fullName", "status", "residentName", "company", "phone", "edit"`), insert two new keys before `"edit"`:

```json
    "columns": {
      "code": "Código",
      "fullName": "Nombre Completo",
      "status": "Estatus",
      "residentName": "Residente",
      "residentAddress": "Dirección",
      "plates": "Placas",
      "company": "Empresa",
      "phone": "Teléfono",
      "edit": "Editar"
    },
```

In the `providers.columns` block (`"code", "fullName", "company", "phone", "status", "edit"`), insert before `"edit"`:

```json
    "columns": {
      "code": "Código",
      "fullName": "Nombre Completo",
      "company": "Empresa",
      "phone": "Teléfono",
      "status": "Estado",
      "residentAddress": "Dirección",
      "plates": "Placas",
      "edit": "Editar"
    },
```

- [ ] **Step 2: Add EN keys**

Edit `packages/i18n/src/messages/en.json`. Apply the same insertion (mirror placement):

`visitPersons.columns`:

```json
    "columns": {
      "code": "Code",
      "fullName": "Full Name",
      "status": "Status",
      "residentName": "Resident",
      "residentAddress": "Address",
      "plates": "Plates",
      "company": "Company",
      "phone": "Phone",
      "edit": "Edit"
    },
```

`providers.columns`:

```json
    "columns": {
      "code": "Code",
      "fullName": "Full Name",
      "company": "Company",
      "phone": "Phone",
      "status": "Status",
      "residentAddress": "Address",
      "plates": "Plates",
      "edit": "Edit"
    },
```

- [ ] **Step 3: Confirm both JSON files still parse**

Run: `pnpm --filter @ramcar/i18n typecheck` (or `pnpm typecheck` from the root if the package has no standalone script)
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/i18n/src/messages/es.json packages/i18n/src/messages/en.json
git commit -m "feat(i18n): add residentAddress and plates labels for visitors and providers"
```

---

### Task 8: Web Providers catalog — add the two columns

**Files:**
- Modify: `apps/web/src/features/providers/components/providers-table-columns.tsx`

- [ ] **Step 1: Update the file**

Edit `apps/web/src/features/providers/components/providers-table-columns.tsx`. Replace the entire file body with:

```tsx
"use client";

import { Badge, Button } from "@ramcar/ui";
import { Pencil } from "lucide-react";
import { PlatesCell } from "@ramcar/features/shared";
import type { VisitPerson, VisitPersonStatus } from "../types";

const statusVariantMap: Record<VisitPersonStatus, "default" | "destructive" | "warning"> = {
  allowed: "default",
  flagged: "warning",
  denied: "destructive",
};

interface ColumnDef {
  key: string;
  header: string;
  render: (person: VisitPerson) => React.ReactNode;
}

interface GetProviderColumnsOptions {
  onEditPerson?: (person: VisitPerson) => void;
  editLabel?: string;
}

export function getProviderColumns(
  t: (key: string) => string,
  tStatus: (key: string) => string,
  options: GetProviderColumnsOptions = {},
): ColumnDef[] {
  const columns: ColumnDef[] = [
    {
      key: "code",
      header: t("columns.code"),
      render: (p) => <span className="font-mono text-xs">{p.code}</span>,
    },
    {
      key: "full_name",
      header: t("columns.fullName"),
      render: (p) => <span className="font-medium">{p.fullName}</span>,
    },
    {
      key: "company",
      header: t("columns.company"),
      render: (p) => p.company ?? "—",
    },
    {
      key: "phone",
      header: t("columns.phone"),
      render: (p) => p.phone ?? "—",
    },
    {
      key: "status",
      header: t("columns.status"),
      render: (p) => (
        <Badge variant={statusVariantMap[p.status]}>{tStatus(p.status)}</Badge>
      ),
    },
    {
      key: "resident_address",
      header: t("columns.residentAddress"),
      render: (p) => (
        <span className="text-sm">{p.residentAddress ?? "—"}</span>
      ),
    },
    {
      key: "plates",
      header: t("columns.plates"),
      render: (p) => <PlatesCell plates={p.vehiclePlates} />,
    },
  ];

  if (options.onEditPerson) {
    columns.push({
      key: "actions",
      header: t("columns.edit"),
      render: (p) => (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={options.editLabel}
            onClick={(e) => {
              e.stopPropagation();
              options.onEditPerson?.(p);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      ),
    });
  }

  return columns;
}
```

`PlatesCell` is imported from `@ramcar/features/shared` (the package barrel exports it via Task 5). The web's existing `providers` `t(...)` namespace is `providers`, so `t("columns.residentAddress")` resolves against the `providers.columns` block added in Task 7.

- [ ] **Step 2: Confirm the web app typechecks**

Run: `pnpm --filter @ramcar/web typecheck`
Expected: PASS — `VisitPerson` now has `residentAddress` and `vehiclePlates` (Task 1), and `PlatesCell` is exported from `@ramcar/features/shared` (Task 5).

- [ ] **Step 3: Run any web provider tests if present**

Run: `pnpm --filter @ramcar/web test -- providers`
Expected: PASS or no-tests-found — there is no existing provider column test (per the spec's "Skipped (deliberate)" decision).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/providers/components/providers-table-columns.tsx
git commit -m "feat(web/providers): add resident address and plates columns"
```

---

### Task 9: Desktop Providers catalog — add the two columns

**Files:**
- Modify: `apps/desktop/src/features/providers/components/providers-table-columns.tsx`

- [ ] **Step 1: Update the file**

Edit `apps/desktop/src/features/providers/components/providers-table-columns.tsx`. Replace the entire file body with:

```tsx
import { Badge, Button } from "@ramcar/ui";
import { Pencil } from "lucide-react";
import { PlatesCell } from "@ramcar/features/shared";
import type { VisitPerson, VisitPersonStatus } from "../types";

const statusVariantMap: Record<VisitPersonStatus, "default" | "warning" | "destructive"> = {
  allowed: "default",
  flagged: "warning",
  denied: "destructive",
};

interface Column {
  key: string;
  header: string;
  render: (person: VisitPerson) => React.ReactNode;
}

interface ColumnOptions {
  onEditPerson?: (person: VisitPerson) => void;
  editLabel?: string;
}

export function getProviderColumns(
  t: (key: string) => string,
  options: ColumnOptions = {},
): Column[] {
  const base: Column[] = [
    { key: "code", header: t("providers.columns.code"), render: (p) => <span className="font-mono text-xs">{p.code}</span> },
    { key: "fullName", header: t("providers.columns.fullName"), render: (p) => p.fullName },
    { key: "company", header: t("providers.columns.company"), render: (p) => p.company ?? "—" },
    { key: "phone", header: t("providers.columns.phone"), render: (p) => p.phone ?? "—" },
    { key: "status", header: t("providers.columns.status"), render: (p) => <Badge variant={statusVariantMap[p.status]}>{t(`visitPersons.status.${p.status}`)}</Badge> },
    {
      key: "residentAddress",
      header: t("providers.columns.residentAddress"),
      render: (p) => <span className="text-sm">{p.residentAddress ?? "—"}</span>,
    },
    {
      key: "plates",
      header: t("providers.columns.plates"),
      render: (p) => <PlatesCell plates={p.vehiclePlates} />,
    },
  ];

  if (options.onEditPerson) {
    const onEdit = options.onEditPerson;
    base.push({
      key: "actions",
      header: t("columns.edit"),
      render: (p) => (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={options.editLabel}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(p);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    });
  }

  return base;
}
```

The existing keys in this file already use the fully-qualified `providers.columns.*` namespace (different from the web file's relative `columns.*`); the new keys follow the same pattern.

- [ ] **Step 2: Confirm the desktop app typechecks**

Run: `pnpm --filter @ramcar/desktop typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/features/providers/components/providers-table-columns.tsx
git commit -m "feat(desktop/providers): add resident address and plates columns"
```

---

### Task 10: NotesCell helper for Bitácora (TDD)

**Files:**
- Create: `apps/web/src/features/logbook/components/notes-cell.tsx`
- Create: `apps/web/src/features/logbook/__tests__/notes-cell.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/features/logbook/__tests__/notes-cell.test.tsx`:

```tsx
/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NotesCell } from "../components/notes-cell";

afterEach(() => cleanup());

describe("NotesCell", () => {
  it("renders an em-dash when notes is null", () => {
    render(<NotesCell notes={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders the full text without a tooltip when ≤ 40 characters", () => {
    render(<NotesCell notes="Short note." />);
    expect(screen.getByText("Short note.")).toBeInTheDocument();
    // No tooltip trigger means no element with cursor-help class.
    expect(document.querySelector(".cursor-help")).toBeNull();
  });

  it("truncates with ellipsis and a tooltip trigger when > 40 characters", () => {
    const long = "A".repeat(60);
    render(<NotesCell notes={long} />);
    const truncated = `${"A".repeat(40)}…`;
    expect(screen.getByText(truncated)).toBeInTheDocument();
    expect(document.querySelector(".cursor-help")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm --filter @ramcar/web test -- notes-cell`
Expected: FAIL — module `../components/notes-cell` not found.

- [ ] **Step 3: Implement the component**

Create `apps/web/src/features/logbook/components/notes-cell.tsx`:

```tsx
"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@ramcar/ui";

const TRUNCATE_AT = 40;

export function NotesCell({ notes }: { notes: string | null }) {
  if (!notes) return <span className="text-muted-foreground">—</span>;
  const truncated = notes.length > TRUNCATE_AT;
  const display = truncated ? `${notes.slice(0, TRUNCATE_AT)}…` : notes;

  if (!truncated) return <span className="text-sm">{display}</span>;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-sm cursor-help">{display}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm whitespace-pre-wrap">{notes}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

- [ ] **Step 4: Run the test again and confirm green**

Run: `pnpm --filter @ramcar/web test -- notes-cell`
Expected: PASS — three assertions.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/logbook/components/notes-cell.tsx apps/web/src/features/logbook/__tests__/notes-cell.test.tsx
git commit -m "feat(web/logbook): add NotesCell — truncate-with-tooltip helper"
```

---

### Task 11: Bitácora Visitors columns — add `notes` before `date`

**Files:**
- Modify: `apps/web/src/features/logbook/components/visitors-columns.tsx`

- [ ] **Step 1: Insert the `notes` column**

Edit `apps/web/src/features/logbook/components/visitors-columns.tsx`. Add `import { NotesCell } from "./notes-cell";` next to the existing `import { StatusBadge } from "./status-badge";`. Then in the array returned by `getVisitorsColumns`, insert this entry **immediately before** the existing `date` entry:

```ts
    {
      id: "notes",
      header: t("columns.notes"),
      cell: (item) => <NotesCell notes={item.notes} />,
    },
```

- [ ] **Step 2: Confirm the web app typechecks**

Run: `pnpm --filter @ramcar/web typecheck`
Expected: PASS — `AccessEventListItem.notes` is already `string | null` (see `packages/shared/src/types/access-event.ts:35`).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/logbook/components/visitors-columns.tsx
git commit -m "feat(web/logbook): add notes column to visitors tab"
```

---

### Task 12: Bitácora Providers columns — add `notes` before `date`

**Files:**
- Modify: `apps/web/src/features/logbook/components/providers-columns.tsx`

- [ ] **Step 1: Insert the `notes` column**

Edit `apps/web/src/features/logbook/components/providers-columns.tsx`. Add `import { NotesCell } from "./notes-cell";`. Then in the array returned by `getProvidersColumns`, insert this entry **immediately before** the existing `date` entry:

```ts
    {
      id: "notes",
      header: t("columns.notes"),
      cell: (item) => <NotesCell notes={item.notes} />,
    },
```

- [ ] **Step 2: Confirm the web app typechecks**

Run: `pnpm --filter @ramcar/web typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/logbook/components/providers-columns.tsx
git commit -m "feat(web/logbook): add notes column to providers tab"
```

---

### Task 13: Bitácora Residents columns — add `notes` before `date`

**Files:**
- Modify: `apps/web/src/features/logbook/components/residents-columns.tsx`

- [ ] **Step 1: Insert the `notes` column**

Edit `apps/web/src/features/logbook/components/residents-columns.tsx`. Add `import { NotesCell } from "./notes-cell";`. Then in the array returned by `getResidentsColumns`, insert this entry **immediately before** the existing `date` entry:

```ts
    {
      id: "notes",
      header: t("columns.notes"),
      cell: (item) => <NotesCell notes={item.notes} />,
    },
```

- [ ] **Step 2: Confirm the web app typechecks**

Run: `pnpm --filter @ramcar/web typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/logbook/components/residents-columns.tsx
git commit -m "feat(web/logbook): add notes column to residents tab"
```

---

### Task 14: Bitácora i18n key `logbook.columns.notes`

**Files:**
- Modify: `packages/i18n/src/messages/es.json`
- Modify: `packages/i18n/src/messages/en.json`

- [ ] **Step 1: Add ES key**

In `packages/i18n/src/messages/es.json`, in the `logbook.columns` block (currently has `tenant, code, name, company, residentVisited, direction, vehicle, status, registeredBy, date, unit, mode`), add:

```json
      "notes": "Notas"
```

(insertion point: any position — by convention, place it adjacent to `registeredBy`; the exact JSON key order doesn't affect lookup).

- [ ] **Step 2: Add EN key**

In `packages/i18n/src/messages/en.json`, in the `logbook.columns` block:

```json
      "notes": "Notes"
```

- [ ] **Step 3: Confirm both JSON files still parse**

Run: `pnpm --filter @ramcar/i18n typecheck` (or `pnpm typecheck` from the root)
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/i18n/src/messages/es.json packages/i18n/src/messages/en.json
git commit -m "feat(i18n): add logbook.columns.notes label"
```

---

### Task 15: Logbook table test — assert the new column header and row cell

**Files:**
- Modify: `apps/web/src/features/logbook/__tests__/logbook-table.test.tsx`

This test is already a generic table test (it accepts any column array). Adding a `notes` column to the test's local `columns` constant gives us coverage that the table renders headers and cells correctly with the new shape.

- [ ] **Step 1: Extend the test**

Edit `apps/web/src/features/logbook/__tests__/logbook-table.test.tsx`. Update `sampleItem.notes` to a non-null value:

```ts
  notes: "Lock left ajar",
```

Add a third entry to the local `columns` array:

```ts
  {
    id: "notes",
    header: "Notes",
    cell: (item) => <span data-testid="notes">{item.notes ?? "—"}</span>,
  },
```

Update the existing skeleton-count expectation to match the new column count: `5 skeleton rows × 4 columns (tenant + 3 caller-supplied) = 20 placeholders`:

```ts
    expect(skeletons.length).toBe(20);
```

Add a new assertion inside the `"renders rows when data is present"` test:

```ts
    expect(screen.getByTestId("notes")).toHaveTextContent("Lock left ajar");
```

- [ ] **Step 2: Run the logbook table test and confirm green**

Run: `pnpm --filter @ramcar/web test -- logbook-table`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/logbook/__tests__/logbook-table.test.tsx
git commit -m "test(web/logbook): cover notes column in logbook-table test"
```

---

### Task 16: CSV export labels — insert "Notes" / "Notas" in `LOGBOOK_CSV_LABELS`

**Files:**
- Modify: `packages/shared/src/types/access-event.ts`

- [ ] **Step 1: Insert the new column header in all six arrays**

Edit `packages/shared/src/types/access-event.ts`. Replace the `LOGBOOK_CSV_LABELS` constant with:

```ts
export const LOGBOOK_CSV_LABELS = {
  en: {
    visitors: {
      columns: ["Code", "Name", "Direction", "Resident visited", "Vehicle", "Status", "Registered by", "Notes", "Date"],
    },
    providers: {
      columns: ["Code", "Name", "Company", "Direction", "Vehicle", "Status", "Registered by", "Notes", "Date"],
    },
    residents: {
      columns: ["Name", "Unit", "Direction", "Mode", "Vehicle", "Registered by", "Notes", "Date"],
    },
    direction: { entry: "Entry", exit: "Exit" },
    accessMode: { vehicle: "Vehicle", pedestrian: "Pedestrian" },
    status: { allowed: "Allowed", flagged: "Flagged", denied: "Denied" },
  },
  es: {
    visitors: {
      columns: ["Código", "Nombre", "Dirección", "Residente visitado", "Vehículo", "Estado", "Registrado por", "Notas", "Fecha"],
    },
    providers: {
      columns: ["Código", "Nombre", "Empresa", "Dirección", "Vehículo", "Estado", "Registrado por", "Notas", "Fecha"],
    },
    residents: {
      columns: ["Nombre", "Unidad", "Dirección", "Modo", "Vehículo", "Registrado por", "Notas", "Fecha"],
    },
    direction: { entry: "Entrada", exit: "Salida" },
    accessMode: { vehicle: "Vehículo", pedestrian: "Peatón" },
    status: { allowed: "Permitido", flagged: "Marcado", denied: "Denegado" },
  },
} as const;
```

- [ ] **Step 2: Confirm the package typechecks**

Run: `pnpm --filter @ramcar/shared typecheck`
Expected: PASS — only string array literals changed.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types/access-event.ts
git commit -m "feat(shared): add Notes column to LOGBOOK_CSV_LABELS for all locales"
```

---

### Task 17: API CSV row builder — emit `item.notes ?? ""` between `registeredBy` and `date`

**Files:**
- Modify: `apps/api/src/modules/access-events/access-events.csv.ts`
- Modify: `apps/api/src/modules/access-events/__tests__/access-events.csv.spec.ts`

- [ ] **Step 1: Update `itemToRow` in `access-events.csv.ts`**

Edit `apps/api/src/modules/access-events/access-events.csv.ts`. Inside the `itemToRow` function, in each of the three branches (`visitors`, `providers`, `residents`), insert `item.notes ?? ""` immediately before the trailing `formatDate(item.createdAt)`:

```ts
  if (subpage === "visitors") {
    fields = [
      item.visitPerson?.code ?? "",
      item.visitPerson?.fullName ?? "",
      direction,
      item.visitPerson?.residentFullName ?? "",
      vehicle,
      item.visitPerson
        ? labels.status[
            item.visitPerson.status as keyof typeof labels.status
          ] ?? ""
        : "",
      item.registeredBy.fullName,
      item.notes ?? "",
      formatDate(item.createdAt),
    ];
  } else if (subpage === "providers") {
    fields = [
      item.visitPerson?.code ?? "",
      item.visitPerson?.fullName ?? "",
      item.visitPerson?.company ?? "",
      direction,
      vehicle,
      item.visitPerson
        ? labels.status[
            item.visitPerson.status as keyof typeof labels.status
          ] ?? ""
        : "",
      item.registeredBy.fullName,
      item.notes ?? "",
      formatDate(item.createdAt),
    ];
  } else {
    const mode =
      labels.accessMode[item.accessMode as keyof typeof labels.accessMode] ??
      item.accessMode;
    fields = [
      item.resident?.fullName ?? "",
      item.resident?.unit ?? "",
      direction,
      mode,
      vehicle,
      item.registeredBy.fullName,
      item.notes ?? "",
      formatDate(item.createdAt),
    ];
  }
```

- [ ] **Step 2: Update three `getHeaderRow` assertions**

Edit `apps/api/src/modules/access-events/__tests__/access-events.csv.spec.ts`. In `describe("getHeaderRow", …)`:

Replace:

```ts
  it("returns the English visitors header", () => {
    const row = getHeaderRow("visitor", "en", false);
    expect(row).toBe(
      "Code,Name,Direction,Resident visited,Vehicle,Status,Registered by,Date\r\n",
    );
  });

  it("returns the Spanish providers header", () => {
    const row = getHeaderRow("service_provider", "es", false);
    expect(row).toBe(
      "Código,Nombre,Empresa,Dirección,Vehículo,Estado,Registrado por,Fecha\r\n",
    );
  });

  it("returns the English residents header", () => {
    const row = getHeaderRow("resident", "en", false);
    expect(row).toBe(
      "Name,Unit,Direction,Mode,Vehicle,Registered by,Date\r\n",
    );
  });
```

with:

```ts
  it("returns the English visitors header", () => {
    const row = getHeaderRow("visitor", "en", false);
    expect(row).toBe(
      "Code,Name,Direction,Resident visited,Vehicle,Status,Registered by,Notes,Date\r\n",
    );
  });

  it("returns the Spanish providers header", () => {
    const row = getHeaderRow("service_provider", "es", false);
    expect(row).toBe(
      "Código,Nombre,Empresa,Dirección,Vehículo,Estado,Registrado por,Notas,Fecha\r\n",
    );
  });

  it("returns the English residents header", () => {
    const row = getHeaderRow("resident", "en", false);
    expect(row).toBe(
      "Name,Unit,Direction,Mode,Vehicle,Registered by,Notes,Date\r\n",
    );
  });
```

- [ ] **Step 3: Update column-count phrasing in `itemToRow` describes**

In `describe("itemToRow — visitors", …)`, replace:

```ts
  it("produces the 8-column visitor row in English", () => {
```

with:

```ts
  it("produces the 9-column visitor row in English", () => {
```

In `describe("itemToRow — providers", …)`, replace:

```ts
  it("produces 8-column provider row with company before direction", () => {
```

with:

```ts
  it("produces 9-column provider row with company before direction", () => {
```

In `describe("itemToRow — residents", …)`, replace:

```ts
  it("produces the 7-column resident row with Unit after Name", () => {
```

with:

```ts
  it("produces the 8-column resident row with Unit after Name", () => {
```

The existing positional assertions (`parts[0]`, `parts[2]`, `parts[3]`, `parts[4]`) all reference indices ≤ 5, and the notes column is inserted at index 7 (visitors/providers) or index 6 (residents). None of the existing positional assertions change.

- [ ] **Step 4: Add positive notes assertions**

Append a new describe block at the end of the file, after `describe("CSV_BOM", …)`:

```ts
// ---------------------------------------------------------------------------
// notes column (inserted between registeredBy and date)
// ---------------------------------------------------------------------------

describe("itemToRow — notes column", () => {
  it("emits the visitor notes value at index 7 (between registeredBy and date)", () => {
    const row = itemToRow(
      makeVisitorItem({ notes: "Lock left ajar" }),
      "visitor",
      "en",
      false,
    );
    const parts = row.replace(/\r\n$/, "").split(",");
    expect(parts[6]).toBe("Guard Bob");
    expect(parts[7]).toBe("Lock left ajar");
  });

  it("emits empty string for null notes on a visitor row", () => {
    const row = itemToRow(
      makeVisitorItem({ notes: null }),
      "visitor",
      "en",
      false,
    );
    const parts = row.replace(/\r\n$/, "").split(",");
    expect(parts[7]).toBe("");
  });

  it("emits the provider notes value at index 7", () => {
    const row = itemToRow(
      makeVisitorItem({
        personType: "service_provider",
        visitPerson: {
          ...makeVisitorItem().visitPerson!,
          company: "Widgets Co",
        },
        notes: "Delivered package",
      }),
      "service_provider",
      "en",
      false,
    );
    const parts = row.replace(/\r\n$/, "").split(",");
    expect(parts[6]).toBe("Guard Bob");
    expect(parts[7]).toBe("Delivered package");
  });

  it("emits the resident notes value at index 6", () => {
    const residentItem: AccessEventListItem = {
      id: "e3",
      tenantId: "t1",
      tenantName: "Acme",
      personType: "resident",
      direction: "exit",
      accessMode: "pedestrian",
      notes: "Late return",
      createdAt: "2026-04-22T12:00:00.000Z",
      visitPerson: null,
      resident: { id: "r1", fullName: "Alice", unit: "A-101" },
      vehicle: null,
      registeredBy: { id: "g1", fullName: "Guard Bob" },
    };
    const row = itemToRow(residentItem, "resident", "en", false);
    const parts = row.replace(/\r\n$/, "").split(",");
    expect(parts[5]).toBe("Guard Bob");
    expect(parts[6]).toBe("Late return");
  });
});
```

(Note: the existing `omits vehicle for pedestrian access` test asserts `parts[4]` and is unaffected — vehicle stays at index 4 because the notes insertion is later in the row.)

- [ ] **Step 5: Run the csv spec and confirm green**

Run: `pnpm --filter @ramcar/api test -- access-events.csv`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/access-events/access-events.csv.ts apps/api/src/modules/access-events/__tests__/access-events.csv.spec.ts
git commit -m "feat(api/access-events): emit Notes column in CSV export between registeredBy and date"
```

---

### Task 18: Final verification — build gates and manual smoke test

**Files:** none (verification only)

- [ ] **Step 1: Typecheck the whole monorepo**

Run: `pnpm typecheck`
Expected: PASS across all workspaces.

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Run the full test suite**

Run: `pnpm test`
Expected: PASS — including the three new specs (visit-persons.enrichment, plates-cell, notes-cell), the extended visitors-table and logbook-table tests, and the updated access-events.csv spec.

- [ ] **Step 4: Run the shared-features duplication check**

Run: `pnpm check:shared-features`
Expected: PASS — the script scans only `apps/{web,desktop}/src/features/<migrated-feature>/` (per `scripts/check-shared-features.ts`); new files under `packages/features/src/shared/` are out of scope.

- [ ] **Step 5: Manual smoke — Web (`apps/web`)**

Run: `pnpm --filter @ramcar/web dev` (or `pnpm dev` from the root)

In a browser:
1. Navigate to `/<locale>/visits-and-residents/visitors`. Confirm: `Address` column shows the resident's address (or `—` for visitors with no resident or with a resident missing an address); `Plates` column shows the first plate as monospace text plus a `+N` badge for visitors with multiple vehicles, the single plate alone for one vehicle, and `—` for visitors without vehicles.
2. Navigate to `/<locale>/visits-and-residents/providers`. Same checks for both columns.
3. Navigate to `/<locale>/logbook/visitors`, `/<locale>/logbook/providers`, `/<locale>/logbook/residents`. For each, confirm a `Notes` column appears immediately before `Date`. Hover a long note to verify the tooltip shows the full text. Short notes should render plain (no tooltip on hover).
4. From the Bitácora export menu, export the current view as CSV for each of the three tabs. Open the file and confirm the header row contains `Notes` / `Notas` between `Registered by` / `Registrado por` and `Date` / `Fecha`, and that the corresponding cell value matches the row's note (or is empty for null notes).

- [ ] **Step 6: Manual smoke — Desktop (`apps/desktop`)**

Run: `pnpm --filter @ramcar/desktop dev`

In the desktop app:
1. Open the Visitors catalog. Confirm the `Address` and `Plates` columns appear and behave the same as on the web (the Visitors view is shared via `@ramcar/features`, so visual parity is expected).
2. Open the Providers catalog. Same checks.
3. The desktop Bitácora pages are stubs — no manual check there (out of scope per the spec).

- [ ] **Step 7: If all gates and manual checks pass, the work is complete**

If any check fails, fix the smallest cause first; do not introduce a new abstraction to bypass it. After fixing, re-run the gates from Step 1.

---

## Spec coverage map

| Spec section | Tasks |
|---|---|
| Shared types — `VisitPerson` extension | 1 |
| API — `fetchResidentDisplayInfo` rename + single-row updates | 2 |
| API — `fetchVehiclePlates` | 3 |
| API — `list()` orchestration | 4 |
| Shared `PlatesCell` | 5 |
| Visitors columns | 6 |
| Visitor + Provider i18n keys | 7 |
| Web Providers columns | 8 |
| Desktop Providers columns | 9 |
| `NotesCell` | 10 |
| Bitácora Visitors / Providers / Residents columns | 11, 12, 13 |
| Bitácora i18n key | 14 |
| Logbook table test extension | 15 |
| `LOGBOOK_CSV_LABELS` update | 16 |
| API CSV row builder + spec | 17 |
| Build gates + manual verification | 18 |

## Risks (carried from spec, plus one new)

| Risk | Mitigation |
|---|---|
| CSV header/row count mismatch when notes is added. | Tasks 16 and 17 land in adjacent commits; Task 17 includes a positional assertion. Manual CSV export in Task 18 visually confirms alignment. |
| `fetchVehiclePlates` returns plates from soft-deleted vehicles. | `fetchVehiclePlates` filters `deleted_at IS NULL` (Task 3) per `20260428000000_vehicles_soft_delete.sql`. |
| Rename of `fetchResidentNames` → `fetchResidentDisplayInfo` breaks an unseen caller. | The helper is `private`; `grep -rn "fetchResidentNames"` returns only the service file. TypeScript catches any remaining caller during `pnpm typecheck` in Task 18. |
| Per-app provider table duplication causes drift. | Tasks 8 and 9 edit both files in adjacent commits; Task 18 manually verifies both apps. Migration to `@ramcar/features/providers` remains out of scope. |
| **Spec was wrong about CSV being client-side.** | Plan corrects this in Task 17 by editing `apps/api/src/modules/access-events/access-events.csv.ts`. The web hook `use-logbook-export.ts` is not edited — it only triggers a download. |

## Out-of-scope follow-ups (carried from spec)

- Migrating the Providers catalog to `@ramcar/features` and deleting the two per-app copies.
- Building out the desktop Bitácora pages (`apps/desktop/src/features/access-log/pages/*`) — currently placeholders.
- Sortable/filterable address and plates columns in the catalog tables.
