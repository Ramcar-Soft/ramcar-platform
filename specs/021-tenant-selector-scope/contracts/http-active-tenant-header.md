# Contract — `X-Active-Tenant-Id` HTTP Header

**Feature**: 021-tenant-selector-scope
**Introduced by**: this spec.
**Applies to**: every HTTP request from `apps/web`, `apps/desktop` (renderer and sync engine), and any future first-party client, to the NestJS API at `apps/api`.

This is the single protocol change this spec introduces. No new endpoints, no new DTOs, no new query parameters.

---

## Wire format

```http
GET /api/users HTTP/1.1
Host: api.ramcar.local
Authorization: Bearer <supabase-access-token>
X-Active-Tenant-Id: 3d8b2fbc-5f2e-4a8c-9b1a-7e6c9d0d1b2a
```

- **Header name**: `X-Active-Tenant-Id` (case-insensitive per RFC 7230, but clients MUST use this canonical casing).
- **Header value**: a RFC 4122 UUID string. No quoting, no surrounding whitespace.
- **Presence**: REQUIRED on every authenticated request except:
  - `POST /api/auth/*` (no tenant context yet).
  - `GET /api/tenants/selector` (the endpoint that returns the authorized tenant list — must work before the client has a valid active tenant).
  - Pre-flight `OPTIONS` requests (CORS handles itself).
- **Absence**: if missing on a request that requires it, the API responds `400 Bad Request` with body `{ "code": "ACTIVE_TENANT_REQUIRED", "message": "X-Active-Tenant-Id header is required." }`. The client SHOULD treat this as a client bug (never a retryable condition).
- **Cache interaction**: requests with different `X-Active-Tenant-Id` values are distinct from an HTTP-cache perspective. The API MUST set `Vary: X-Active-Tenant-Id` on any cacheable response.

---

## Client responsibilities

### Web (`apps/web/src/shared/lib/api-client.ts`)

- On every outbound request, read `activeTenantId` from the Zustand `authSlice` snapshot and set the header. If the snapshot is `null` (pre-hydration), block the request with a rejected promise — feature hooks should not fire before hydration completes.
- Do NOT attach the header on the exemption list above.
- Do NOT fall back to the first id in `tenantIds` silently; if `activeTenantId` is null on a request that needs it, the transport has a bug and should throw.

### Desktop renderer (`apps/desktop/src/shared/lib/api-client.ts`)

- Same behavior as web. The renderer reads the authSlice exactly as the web app does.

### Desktop sync engine (`apps/desktop/electron/services/sync-engine.ts`)

- On each outbox flush, the header value is the row's `tenant_id` column — NOT the currently active UI tenant. This preserves FR-010: capture-time tenant survives mid-session switches.
- If the row's `tenant_id` is `'unknown'` (backfill fallback), the engine SHOULD NOT flush; instead, the row is promoted to `status = 'error'` and surfaced in the sync-status UI for manual resolution.

---

## Server responsibilities

### `TenantGuard` (`apps/api/src/common/guards/tenant.guard.ts`)

Order of operations on every guarded request:

1. Read `X-Active-Tenant-Id` from the request headers.
2. Read `tenant_ids` from the JWT's `app_metadata` (populated by spec 020's `sync_user_app_metadata` function).
3. Validate `X-Active-Tenant-Id ∈ tenant_ids`. If not:
   - Respond `403 Forbidden` with body `{ "code": "TENANT_ACCESS_REVOKED", "message": "You no longer have access to the requested tenant.", "tenantIds": <refreshed list> }`.
   - Do NOT proceed to the handler.
4. Store the validated value on `request.tenantScope.tenantId` and `request.tenantScope.tenantIds` (the latter for super-admin-aware UIs). The existing `@CurrentTenant()` decorator already reads `request.tenantScope`.
5. Fall through to the handler.

**Legacy query/body fallback** from spec 020 (guard reads `req.params.tenantId`, `req.query.tenantId`, `req.body.tenant_id`) is removed as part of this spec. Rationale: a single source of truth (the header) prevents the ambiguity the spec targets. The one exception is Bitacora, whose endpoint receives `tenant_id` as an explicit query param (the view-local filter) — the guard treats that param as a Bitacora-only override and still validates it against `tenant_ids`.

### `@CurrentTenant()` decorator (`apps/api/src/common/decorators/current-tenant.decorator.ts`)

- Continues to expose `scope.tenantId: string` (strict — no `undefined`; the guard has enforced it).
- Continues to expose `scope.tenantIds: string[]` for features that need the full membership list (super-admin dashboards, Bitacora's cross-tenant mode).

### Per-module behavior

- **Read endpoints** (`GET /api/users`, `/api/residents`, `/api/visit-persons`, `/api/access-events`, patrols, blacklist, dashboard metrics): filter the repository query by `scope.tenantId`. Ignore any client-supplied tenant override on these endpoints.
- **Write endpoints** (`POST /api/access-events`, `POST/PATCH /api/visit-persons`, `POST/PATCH /api/vehicles`, `POST/PATCH /api/residents`): stamp `scope.tenantId` onto the new or mutated row. Any `tenant_id` sent in the request body is ignored.
- **Bitacora** (`GET /api/access-events?tenant_id=...` or the dedicated logbook endpoint): the `tenant_id` query param is the filter; the header is still validated but the param drives the WHERE clause. `"ALL"` as a query param is accepted only if `scope.role === 'super_admin'`; otherwise it is rejected with 403.

---

## Error contract (client-observable)

| Status | Code | Trigger | Client action |
|---|---|---|---|
| `400` | `ACTIVE_TENANT_REQUIRED` | Header missing on a non-exempt endpoint | Surface to telemetry; do not retry. |
| `403` | `TENANT_ACCESS_REVOKED` | Header value ∉ `tenant_ids` | Trigger recovery flow (research R5): refresh JWT, hydrate authSlice, cancel in-flight queries, toast. |
| `403` | `CROSS_TENANT_DETAIL_DENIED` | Detail endpoint reached a row not in `scope.tenantId` | Redirect to the list; toast "That record is not in the current community." |

All other existing codes (`401`, `404`, `422`, etc.) are unchanged.

---

## Observability

- The API MUST log `x-active-tenant-id` in the request log line (Nest's `Logger` interceptor). PII policy: tenant UUIDs are low-sensitivity and already appear in database audit trails.
- The web and desktop HTTP clients MUST include `x-active-tenant-id` in the request attributes sent to error telemetry (Sentry breadcrumbs) so failed requests can be correlated to a tenant.

---

## Backwards compatibility

- No external consumers (mobile app, third-party integrations) exist today that call these endpoints without the header. The mobile app repo is outside this monorepo and will pick up the header in its own spec when/if it adopts multi-tenant browsing.
- Existing internal test harnesses and mocked fetches will be updated as part of Phase 2 tasks.
