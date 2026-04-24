# Contract — Endpoint Scoping Matrix

**Feature**: 021-tenant-selector-scope

This matrix enumerates, for each existing NestJS endpoint the feature touches, how the active tenant is applied. It is the authoritative per-endpoint checklist Phase 2 tasks will work from. **No new endpoints are introduced.**

Conventions:
- **`scope.tenantId`** = the value of `X-Active-Tenant-Id` validated by `TenantGuard`.
- **`scope.tenantIds`** = the full authorized list from the JWT (used only by endpoints that legitimately cross tenants — today only the tenant selector and Bitacora's super-admin mode).
- **Client key (TanStack Query)** shows the target key shape; any missing `activeTenantId` discriminator is a refactor line-item.
- "Write attaches" = the server stamps `scope.tenantId` onto the new/mutated row; any client-sent `tenant_id` in the body is ignored.

---

## Admin portal (`apps/web`)

| Endpoint | Method | Scope applied | Write attaches | Client key (before → after) |
|---|---|---|---|---|
| `/api/users` | `GET` | `WHERE tenant_id = scope.tenantId` (via `public.user_tenants`) | N/A (read) | `["users", filters]` → **`["users", activeTenantId, filters]`** |
| `/api/users/:id` | `GET` | Row read; 403 if row's tenant ∉ `{scope.tenantId}` | N/A | `["users", id]` → **`["users", activeTenantId, id]`** |
| `/api/users` | `POST` | — | `public.user_tenants` row carries `scope.tenantId` | invalidate `["users", activeTenantId]` |
| `/api/users/:id` | `PATCH` | row.tenant = scope | (unchanged — no tenant change) | invalidate `["users", activeTenantId]` and `["users", activeTenantId, id]` |
| `/api/users/:id` | `DELETE` | row.tenant = scope | detach `user_tenants` row with matching `tenant_id` only | invalidate `["users", activeTenantId]` |
| `/api/residents` (or `/api/users?role=resident`) | `GET` | `WHERE tenant_id = scope.tenantId AND role = 'resident'` | N/A | `["residents", "list", filters]` → **`["residents", activeTenantId, "list", filters]`** |
| `/api/residents/:id` | `GET` | row.tenant = scope | N/A | `["residents", id]` → **`["residents", activeTenantId, id]`** |
| `/api/residents/:id/vehicles` | `GET` | `WHERE vehicles.tenant_id = scope.tenantId AND resident_id = :id` | N/A | `["vehicles", activeTenantId, "resident", residentId]` (already correct) |
| `/api/visit-persons` | `GET` | `WHERE tenant_id = scope.tenantId` | N/A | `["visit-persons", filters]` → **`["visit-persons", activeTenantId, filters]`** |
| `/api/visit-persons/:id` | `GET` | row.tenant = scope | N/A | **`["visit-persons", activeTenantId, id]`** |
| `/api/visit-persons` | `POST` | — | row.tenant = `scope.tenantId` | invalidate `["visit-persons", activeTenantId]` |
| `/api/visit-persons/:id` | `PATCH` | row.tenant = scope | (unchanged) | invalidate `["visit-persons", activeTenantId]` + detail |
| `/api/vehicles` | `POST` | — | row.tenant = `scope.tenantId` | invalidate `["vehicles", activeTenantId, *]` |
| `/api/vehicles/:id` | `PATCH` | row.tenant = scope | (unchanged) | invalidate `["vehicles", activeTenantId, *]` |
| `/api/access-events` (admin access log) | `GET` | `WHERE tenant_id = scope.tenantId` | N/A | `["access-events", "admin-list", filters]` → **`["access-events", activeTenantId, "admin-list", filters]`** |
| `/api/access-events` (Bitacora) | `GET` | `WHERE tenant_id = filters.tenant_id` (URL param) AND (`filters.tenant_id = scope.tenantId` OR `scope.role = 'super_admin'`) | N/A | `["access-events", scopeKey, personType, filters]` (already correct; `scopeKey = filters.tenant_id \|\| "ALL"`) |
| `/api/access-events` | `POST` | — | row.tenant = `scope.tenantId` | invalidate `["access-events", activeTenantId, *]` |
| `/api/patrols` | `GET` | `WHERE tenant_id = scope.tenantId` | N/A | `["patrols", filters]` → **`["patrols", activeTenantId, filters]`** |
| `/api/blacklist` | `GET` | `WHERE tenant_id = scope.tenantId` | N/A | `["blacklist", filters]` → **`["blacklist", activeTenantId, filters]`** |
| `/api/dashboard/metrics` | `GET` | `WHERE tenant_id = scope.tenantId` | N/A | `["dashboard", activeTenantId, "metrics"]` (new — add `activeTenantId`) |

---

## Guard booth (`apps/desktop` renderer, online path)

| Endpoint | Method | Scope applied | Write attaches | Client key |
|---|---|---|---|---|
| `/api/residents/search?q=...` | `GET` | `WHERE tenant_id = scope.tenantId AND role = 'resident'` | N/A | **`["residents", activeTenantId, "search", q]`** |
| `/api/visit-persons/search?q=...` | `GET` | `WHERE tenant_id = scope.tenantId` | N/A | **`["visit-persons", activeTenantId, "search", q]`** |
| `/api/visit-persons` | `POST` | — | row.tenant = `scope.tenantId` | online: invalidate. offline: enqueue (see below) |
| `/api/vehicles` | `POST` | — | row.tenant = `scope.tenantId` | offline-aware: enqueue |
| `/api/access-events` | `POST` | — | row.tenant = `scope.tenantId` | offline-aware: enqueue |
| `/api/access-events?recent=…` | `GET` | `WHERE tenant_id = scope.tenantId` | N/A | **`["access-events", activeTenantId, "recent"]`** |

---

## Guard booth (`apps/desktop` sync engine, offline flush)

| Outbox `entity_type` | Action | Server endpoint | Header sent | Notes |
|---|---|---|---|---|
| `visit_person` | `create` | `POST /api/visit-persons` | `X-Active-Tenant-Id: <outbox.tenant_id>` | Uses captured tenant, not UI-active. |
| `visit_person` | `update` | `PATCH /api/visit-persons/:id` | `X-Active-Tenant-Id: <outbox.tenant_id>` | (spec 012 entity.) |
| `vehicle` | `create` | `POST /api/vehicles` | `X-Active-Tenant-Id: <outbox.tenant_id>` | |
| `access_event` | `create` | `POST /api/access-events` | `X-Active-Tenant-Id: <outbox.tenant_id>` | FR-010 anchor. |
| `visit_person_image` | `upload` | `POST /api/visit-persons/:id/images` | `X-Active-Tenant-Id: <outbox.tenant_id>` | Image upload inherits the visit-person's captured tenant. |

Any row whose `tenant_id` column is `''` or `'unknown'` (pre-migration backfill edge case) is NOT flushed; it is promoted to `status = 'error'` and shown to the user.

---

## Endpoints NOT scoped by active tenant (intentional exceptions)

| Endpoint | Reason |
|---|---|
| `POST /api/auth/sign-in`, `POST /api/auth/sign-out`, refresh | Auth happens before a tenant is known. |
| `GET /api/tenants/selector` | Returns the user's `tenant_ids`; must work before `activeTenantId` is set. |
| `GET /api/users/me` (profile) | Returns the caller's profile; not tenant-scoped. |
| `GET /api/health`, `GET /api/version` | Ops/liveness. |

These endpoints MUST accept requests with NO `X-Active-Tenant-Id` header without erroring.

---

## Role behavior

| Role | Selector shows | Reads return | Writes target |
|---|---|---|---|
| `Guard` | Only tenant(s) from their `user_tenants` rows. Multi-tenant guards see a switcher; single-tenant guards see a static label (FR-004). | Rows scoped to `activeTenantId`. | `activeTenantId` at capture time. |
| `Admin` | Their authorized `tenant_ids`. | Rows scoped to `activeTenantId`. | `activeTenantId` at write time. |
| `SuperAdmin` | All tenants (`scope.role === 'super_admin'` — the API joins `public.tenants` directly). | Rows scoped to `activeTenantId`. Bitacora may cross-tenant via `"ALL"` URL param. | `activeTenantId` at write time. |
| `Resident` | Not rendered. Resident reads are row-owner scoped, not tenant-switcher scoped (FR-024). | Resident's own rows only. | Resident does not write through this path. |

---

## Test targets

Phase 2 tasks will generate tests against:

1. For every read endpoint above: a Jest API test where session A has Tenant A active, session B has Tenant B active, and the same URL yields disjoint data. (Multi-tenant isolation per Principle I.)
2. For every write endpoint above: a Jest test that `scope.tenantId` is stamped onto the row regardless of any `tenant_id` in the request body.
3. For the guard: tests for (a) missing header → 400, (b) header ∉ `tenant_ids` → 403, (c) Bitacora `tenant_id` query ∈ `tenant_ids` → allowed, ∉ → 403.
4. For the desktop sync engine: an integration test where the UI switches tenant between capture and flush, and the flushed row still carries the capture-time tenant.
