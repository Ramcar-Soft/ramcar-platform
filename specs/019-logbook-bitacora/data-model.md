# Phase 1 — Data Model: Access Log (Bitácora)

**Feature**: `019-logbook-bitacora`
**Date**: 2026-04-22

## Scope statement

The Logbook is a **read-only projection** over existing entities. There are no new entities. Schema touches are limited to one additive column:

- `public.tenants`: `ADD COLUMN time_zone text NOT NULL DEFAULT 'UTC'` — needed for per-tenant "Today" computations (research R3). No data backfill required beyond the column default; operations will update real rows to IANA names in a follow-up.

Everything else is derived by joins over tables that already exist:

- `access_events` — the authoritative log
- `visit_persons` — visitor/provider master
- `profiles` — residents, guards, SuperAdmins; Unit column also reads from here (`address`, per research R6)
- `vehicles` — plate + brand for vehicle-mode events
- `tenants` — tenant name (for SuperAdmin multi-tenant mode) + `time_zone`

## Read-only projection: `AccessEventListItem`

The list endpoint returns rows denormalised enough to render any of the three subpage tables without further fetches (FR-037). A single projection type covers all three subpages; the frontend picks which fields to display. The same type drives the CSV writer.

```ts
// packages/shared/src/types/access-event.ts (new export)
export interface AccessEventListItem {
  id: string;                              // access_events.id (row key)
  tenantId: string;                        // access_events.tenant_id
  tenantName: string | null;               // tenants.name — populated only in SuperAdmin multi-tenant mode; null otherwise
  personType: PersonType;                  // 'visitor' | 'service_provider' | 'resident'
  direction: Direction;                    // 'entry' | 'exit'
  accessMode: AccessMode;                  // 'vehicle' | 'pedestrian'
  notes: string | null;                    // access_events.notes
  createdAt: string;                       // access_events.created_at (ISO 8601 UTC)

  // Person — at most one of these two blocks is populated per row, consistent with access_events.chk_access_person
  visitPerson: {
    id: string;                            // visit_persons.id
    code: string;                          // visit_persons.code (e.g., "VIS-00042", "PRV-00123")
    fullName: string;                      // visit_persons.full_name
    phone: string | null;
    company: string | null;                // visit_persons.company (providers only; null for visitors)
    status: VisitPersonStatus;             // 'allowed' | 'flagged' | 'denied'
    residentId: string | null;             // visit_persons.resident_id (resident being visited)
    residentFullName: string | null;       // profiles.full_name joined on visit_persons.resident_id
  } | null;
  resident: {
    id: string;                            // profiles.id
    fullName: string;                      // profiles.full_name
    unit: string | null;                   // profiles.address (research R6 — projected as "Unit")
  } | null;

  // Vehicle — populated only when access_mode = 'vehicle'
  vehicle: {
    id: string;                            // vehicles.id
    plate: string | null;                  // vehicles.plate
    brand: string | null;                  // vehicles.brand
    model: string | null;                  // vehicles.model
  } | null;

  // Registering guard — always populated (FR-011/012/013 all require "Registered by")
  registeredBy: {
    id: string;                            // profiles.id of the registering guard
    fullName: string;                      // profiles.full_name
  };
}

export interface AccessEventListResponse {
  data: AccessEventListItem[];
  meta: PaginationMeta;                     // reuse existing PaginationMeta from @ramcar/shared
}
```

**Per-subpage rendering**:

| Subpage column | Source field(s) |
|---|---|
| Code | `visitPerson.code` (visitors, providers) — not shown on residents subpage |
| Name | Visitors/Providers: `visitPerson.fullName` / Residents: `resident.fullName` |
| Company | Providers subpage only: `visitPerson.company` → `—` when null |
| Direction | `direction` → translated via `logbook.direction.{entry,exit}` |
| Resident visited | Visitors subpage only: `visitPerson.residentFullName` → `—` when null |
| Unit | Residents subpage only: `resident.unit` → `—` when null |
| Mode | Residents subpage only: `accessMode` → translated via `logbook.mode.{vehicle,pedestrian}` |
| Vehicle | `accessMode === "vehicle"` ? `vehicle.plate + " — " + vehicle.brand` : `""` |
| Status | Visitors/Providers: `visitPerson.status` → translated badge via `logbook.status.{allowed,flagged,denied}` |
| Registered by | `registeredBy.fullName` |
| Date | `createdAt` rendered via `Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" })` with tenant time zone |
| Tenant | SuperAdmin all-tenants mode only: `tenantName` (appears as a prefix column when `tenantScope === "many"`) |

**Field validation / integrity** (inherited from the DB):
- `access_events.chk_access_person` guarantees exactly one of `visitPerson` / `resident` is populated per row.
- `access_events.chk_access_vehicle` guarantees `vehicle` is populated iff `accessMode === "vehicle"`.
- `registeredBy` is `NOT NULL` in the DB; the projection reflects that (non-optional).

**State transitions**: N/A — rows are immutable once written. Updates on `access_events` (via the existing `PATCH /access-events/:id`) rewrite `direction`, `access_mode`, `vehicle_id`, `notes`. The Logbook reflects the current row contents on next fetch; there is no history view in this MVP.

## Query shape — `AccessEventListQuery` (Zod)

```ts
// packages/shared/src/validators/access-event.ts (new export)
export const accessEventListQuerySchema = z.object({
  personType: z.enum(["visitor", "service_provider", "resident"]),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().refine((v) => [10, 25, 50, 100].includes(v), {
    message: "pageSize must be one of 10, 25, 50, 100",
  }).default(25),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD in tenant time zone
  dateTo:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD in tenant time zone, inclusive
  tenantId: z.string().uuid().optional(),                        // SuperAdmin optional; Admin gets 403 if mismatched
  residentId: z.string().uuid().optional(),
  search: z.string().trim().max(200).optional(),
  locale: z.enum(["en", "es"]).default("en"),                    // for export label lookup; ignored by list but harmless
});

export type AccessEventListQueryInput = z.infer<typeof accessEventListQuerySchema>;
```

**Validation rules beyond the schema** (enforced in the service):
- If both `dateFrom` and `dateTo` are present, `dateFrom <= dateTo` (else 400).
- `dateFrom` defaults to today (tenant local zone) when absent; `dateTo` defaults to `dateFrom` (single day).
- For Admins: `tenantId` must equal the JWT tenant or be omitted — any other value returns 403 (research R4).
- For SuperAdmins: `tenantId` must be in their authorized set when present; else 403.

## Export query shape — `AccessEventExportQuery` (Zod)

```ts
export const accessEventExportQuerySchema = accessEventListQuerySchema.omit({ page: true, pageSize: true });
export type AccessEventExportQueryInput = z.infer<typeof accessEventExportQuerySchema>;
```

- Pagination parameters are omitted — export returns all matching rows.
- For "Export current view", the client forwards its active list query verbatim (minus `page`/`pageSize`).
- For "Export all", the client forwards `personType`, `tenantId` (if any), and the modal-chosen `dateFrom`/`dateTo`, **without** `search` or `residentId` (modal UX in FR-030: "ignores the filter bar's own date range" — but the spec does not say to carry the search/resident filters; by design of the modal, it does not).

## Response shape: CSV stream

The export endpoint does not return JSON. The HTTP response:

- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="logbook-<subpage>-<yyyy-mm-dd>.csv"` where `<yyyy-mm-dd>` is today's date in the first scoped tenant's time zone (for SuperAdmin all-tenants, it's UTC — an explicit design choice; documented in `contracts/access-events-export.md`).
- Body: CSV encoded UTF-8 with leading BOM. Header row + data rows, one per access event. Column set and order match the on-screen table for the subpage (R9 provides the label map).

## React Query cache keys (frontend)

Per the Constitution: all React Query keys MUST include `tenantId`. The Logbook's list key differs slightly from the other features because the effective "tenant scope" is itself a filter (and can be "many"). We encode the scope explicitly to avoid cache collisions between Admin and SuperAdmin views.

| Query | Key shape | Fires when |
|---|---|---|
| List page | `["access-events", scopeKey, personType, filters]` where `scopeKey = actorRole === "super_admin" ? (filters.tenantId ?? "ALL") : actorTenantId` | Route mount + any filter change (URL-driven) |
| Tenant list (SuperAdmin) | `["tenants"]` | SuperAdmin mounts the toolbar |
| Resident resolver | already owned by `ResidentSelect` (spec 018), key `["residents", tenantId, "detail", id]` | When a `resident_id` URL param is present on mount |

The export call is NOT a React Query key — it is a one-shot fetch with a spinner, so there is no cached state to keep in sync.

## Relationships touched by this feature

```
access_events (row)
├── .tenant_id       → tenants.id
│                       tenants.time_zone (new column) → used for date-range boundary math
│                       tenants.name        → tenantName in multi-tenant SuperAdmin mode
├── .person_type = 'visitor' | 'service_provider'
│   └── .visit_person_id → visit_persons.id
│                            visit_persons.code, full_name, phone, company, status
│                            visit_persons.resident_id → profiles.id (visited resident)
│                                                          profiles.full_name  → residentFullName
├── .person_type = 'resident'
│   └── .user_id       → profiles.id (the resident themselves)
│                          profiles.full_name  → resident.fullName
│                          profiles.address    → resident.unit  (research R6)
├── .access_mode = 'vehicle'
│   └── .vehicle_id    → vehicles.id
│                          vehicles.plate, brand, model
└── .registered_by   → profiles.id (the guard)
                        profiles.full_name  → registeredBy.fullName
```

All joins are `INNER` for the required fields (`registered_by` is `NOT NULL`, `tenant_id` is `NOT NULL`) and `LEFT` for the optional relations (visit_person/resident/vehicle). Supabase PostgREST expresses this via hints on embedded selects (e.g., `profiles!access_events_registered_by_fkey(...)`).

## Non-entities (for clarity)

The Logbook does NOT introduce:
- Any new table.
- Any new RLS policy (existing `access_events` SELECT policy already covers tenant + super_admin reads).
- Any new index (the existing `idx_access_events_tenant_type_date` already serves `WHERE tenant_id = ? AND person_type = ? ORDER BY created_at DESC`, which is the dominant query shape).
- Any Realtime subscription (out of scope per the Assumptions).
- Any cache invalidation on create/update (the existing create/update paths already touch the table; the Logbook's React Query keys will naturally refetch on refresh — we do not optimistically push into the Logbook cache because visitors/providers flows are independent features).

## Open items for operations (not a merge blocker)

- After merge, ops should set `tenants.time_zone` to correct IANA names for real tenants (e.g., `'America/Tijuana'`). The Logbook functions correctly with the `'UTC'` default but labels "Today" against UTC boundaries — which may shift reported results by a few hours relative to local midnight. A tracking issue will be opened at merge time.
