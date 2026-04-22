# Contract — `GET /api/access-events` (List)

**Feature**: `019-logbook-bitacora`
**Purpose**: Paginated, filtered, role- and tenant-scoped list of access events for the Logbook.

## Route

```
GET /api/access-events
```

## Authentication / Authorisation

- Guards: `JwtAuthGuard` + `TenantGuard` + `RolesGuard`
- `@Roles("super_admin", "admin")` — method level, narrowing the controller-level `@Roles("super_admin", "admin", "guard")`.
- Request from role `guard` or `resident` → **HTTP 403** (before any tenant filter runs).
- Request with no `Authorization` → **HTTP 401**.

## Query parameters

All parameters are validated by `accessEventListQuerySchema` (Zod) from `@ramcar/shared`:

| Param | Type | Default | Notes |
|---|---|---|---|
| `personType` | `"visitor" \| "service_provider" \| "resident"` | *(required)* | Filters `access_events.person_type`. |
| `page` | int ≥ 1 | `1` | 1-based. |
| `pageSize` | `10 \| 25 \| 50 \| 100` | `25` | Enforced in the schema. |
| `dateFrom` | `YYYY-MM-DD` | tenant-local "today" | Inclusive start. Tenant local time zone (see `tenants.time_zone`). |
| `dateTo` | `YYYY-MM-DD` | tenant-local "today" | Inclusive end. Must be ≥ `dateFrom`. |
| `tenantId` | uuid | — | **Admin**: must equal JWT tenant or be omitted (else 403). **SuperAdmin**: must be in the actor's authorised set when present (else 403). When omitted by a SuperAdmin, the query aggregates across all authorised tenants. |
| `residentId` | uuid | — | On `visitor`/`service_provider`: filters `visit_persons.resident_id`. On `resident`: filters `access_events.user_id`. |
| `search` | string (≤ 200 chars, trimmed) | — | Case-insensitive substring match across `visit_persons.full_name`, `visit_persons.phone`, `visit_persons.company`, `vehicles.plate`, `vehicles.brand`, `vehicles.model`, `access_events.notes`, and the visited resident's `profiles.full_name`. When empty, list uses the plain Supabase select path; when present, the service calls the `search_access_events` RPC (see below). |
| `locale` | `"en" \| "es"` | `"en"` | Ignored by the list endpoint but accepted for parity with the export endpoint. |

### Validation failures

- Missing `personType` → **400** with a Zod error body.
- `dateFrom > dateTo` → **400** (`"dateFrom must be on or before dateTo"`).
- `pageSize` not in `[10, 25, 50, 100]` → **400**.
- Any unknown query key is ignored (no strict mode).

### Role-based tenant scoping

Implemented in the service via a small helper:

```ts
// apps/api/src/modules/access-events/access-events.service.ts
function resolveTenantScope(
  actorRole: Role,
  actorTenantId: string,
  requestedTenantId: string | undefined,
  authorizedTenantIds?: string[],
): { kind: "single"; tenantId: string } | { kind: "many"; tenantIds: string[] };
```

Behaviour:

| Actor role | `requestedTenantId` | `authorizedTenantIds` | Result |
|---|---|---|---|
| `admin` | undefined | (n/a) | `{ single, tenantId: actorTenantId }` |
| `admin` | equals `actorTenantId` | (n/a) | `{ single, tenantId: actorTenantId }` |
| `admin` | any other value | (n/a) | **403** |
| `super_admin` | undefined | `[t1, t2, t3]` | `{ many, [t1, t2, t3] }` |
| `super_admin` | `t2` (in set) | `[t1, t2, t3]` | `{ single, t2 }` |
| `super_admin` | `tX` (not in set) | `[t1, t2, t3]` | **403** |
| `super_admin` | undefined | `[]` (no auth'd tenants) | `{ many, [] }` → empty response (data: [], meta.total: 0) |

## Response shape

### 200 OK

`AccessEventListResponse` (see `data-model.md`):

```json
{
  "data": [
    {
      "id": "...",
      "tenantId": "...",
      "tenantName": null,
      "personType": "visitor",
      "direction": "entry",
      "accessMode": "vehicle",
      "notes": null,
      "createdAt": "2026-04-22T18:34:02.123Z",
      "visitPerson": {
        "id": "...",
        "code": "VIS-00042",
        "fullName": "María Pérez",
        "phone": "+52 664 000 0000",
        "company": null,
        "status": "allowed",
        "residentId": "...",
        "residentFullName": "Laura García"
      },
      "resident": null,
      "vehicle": {
        "id": "...",
        "plate": "ABC-123",
        "brand": "Toyota",
        "model": "Corolla"
      },
      "registeredBy": {
        "id": "...",
        "fullName": "Jorge (Guard)"
      }
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 142,
    "totalPages": 6
  }
}
```

### Error bodies

| Status | Reason | Body shape |
|---|---|---|
| 400 | Validation error | `{ message, issues: [...] }` (Zod validation pipe) |
| 401 | Missing/invalid JWT | `{ statusCode: 401, message: "Unauthorized" }` |
| 403 | Role denial OR Admin cross-tenant OR SuperAdmin unauthorised tenant | `{ statusCode: 403, message: "..." }` |
| 500 | Unexpected | `{ statusCode: 500, message: "..." }` |

## Ordering

- Always `ORDER BY created_at DESC` (FR-010). No user-configurable sort in this MVP.

## Search implementation (SQL)

The search RPC (called only when `search` is non-empty). One-time migration.

```sql
-- Migration: 2026042200000X_add_logbook_support.sql (planned Phase 2)
ALTER TABLE public.tenants
  ADD COLUMN time_zone text NOT NULL DEFAULT 'UTC';

CREATE OR REPLACE FUNCTION public.search_access_events(
  p_tenant_ids uuid[],
  p_person_type text,
  p_date_from timestamptz,
  p_date_to_exclusive timestamptz,
  p_resident_id uuid,
  p_search text,
  p_limit int,
  p_offset int
)
RETURNS TABLE (
  row jsonb,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH filtered AS (
    SELECT ae.*
    FROM public.access_events ae
    LEFT JOIN public.visit_persons vp ON vp.id = ae.visit_person_id
    LEFT JOIN public.profiles resident ON resident.id = COALESCE(ae.user_id, vp.resident_id)
    LEFT JOIN public.vehicles v ON v.id = ae.vehicle_id
    WHERE ae.tenant_id = ANY (p_tenant_ids)
      AND ae.person_type = p_person_type
      AND ae.created_at >= p_date_from
      AND ae.created_at <  p_date_to_exclusive
      AND (p_resident_id IS NULL OR (
        CASE p_person_type
          WHEN 'resident' THEN ae.user_id = p_resident_id
          ELSE vp.resident_id = p_resident_id
        END
      ))
      AND (
        p_search IS NULL OR p_search = ''
        OR vp.full_name    ILIKE '%' || p_search || '%'
        OR vp.phone        ILIKE '%' || p_search || '%'
        OR vp.company      ILIKE '%' || p_search || '%'
        OR v.plate         ILIKE '%' || p_search || '%'
        OR v.brand         ILIKE '%' || p_search || '%'
        OR v.model         ILIKE '%' || p_search || '%'
        OR ae.notes        ILIKE '%' || p_search || '%'
        OR resident.full_name ILIKE '%' || p_search || '%'
      )
  ),
  counted AS (
    SELECT count(*) AS total FROM filtered
  ),
  page AS (
    SELECT f.*
    FROM filtered f
    ORDER BY f.created_at DESC
    OFFSET p_offset LIMIT p_limit
  )
  SELECT
    jsonb_build_object(
      'access_event', to_jsonb(page.*),
      /* The service maps this shape into AccessEventListItem. Joins are performed here in the RPC to avoid PostgREST-cross-table-OR limits. */
    ) AS row,
    (SELECT total FROM counted) AS total_count
  FROM page;
$$;

-- SECURITY INVOKER means the function runs under the caller's RLS context.
-- Combined with the existing access_events SELECT policy, this guarantees that
-- tenants the caller isn't scoped to never appear even if p_tenant_ids contains
-- a bogus id.

GRANT EXECUTE ON FUNCTION public.search_access_events(uuid[], text, timestamptz, timestamptz, uuid, text, int, int)
  TO authenticated;
```

**Notes for Phase 2 implementation:**
- The SQL above is illustrative — the Phase 2 migration may tighten the `row` JSON shape to minimise payload and move joins into `page` rather than `filtered` (both are correct; the latter is slightly more efficient at high offsets). Either way, the RPC must return everything the service needs to build `AccessEventListItem` without a second round-trip.
- When `search` is empty, the service does **not** call this RPC. It uses a plain `supabase.from("access_events").select(...)` with embedded joins and `range(offset, offset+limit-1)` + `{ count: "exact" }`. This keeps the daily "Today" page cheap.
- The RPC runs `SECURITY INVOKER`, so it participates in the existing `access_events` SELECT RLS. That is the defense-in-depth layer.

## Performance expectations

- Default query (today, 25 rows, no search) on a tenant with 5,000 events: < 300 ms p95 including network, backed by the existing `idx_access_events_tenant_type_date` index.
- With `search` present: < 700 ms p95 on the same tenant size. `ILIKE '%...%'` can't use btree; acceptable for the current scale. If growth forces it, the follow-up is a `pg_trgm` GIN index per searched column.
