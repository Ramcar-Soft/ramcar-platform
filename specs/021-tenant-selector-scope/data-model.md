# Phase 1 Data Model — Active Tenant Scoping

**Feature**: 021-tenant-selector-scope
**Date**: 2026-04-24

This feature introduces **no new Postgres tables or columns**. All server-side entities (`public.tenants`, `public.user_tenants`, `public.profiles`, per-domain tables) are reused verbatim from spec 020 and prior. The "data model" for this feature lives in three places:

1. **Client state** — Zustand slices in `@ramcar/store` and `apps/web/src/shared/hooks/`.
2. **Desktop outbox row** — one additive SQLite column on the booth's local database.
3. **Wire shape** — the `X-Active-Tenant-Id` HTTP header (see `contracts/http-active-tenant-header.md`).

Each is modeled below with fields, derivation rules, state transitions, and validation.

---

## 1. Active Tenant Selection (client, per device)

**Owner**: `@ramcar/store` — `authSlice`.
**Persistence**: `localStorage` (web and desktop renderer) via the slice's existing persistence hooks (`ACTIVE_TENANT_KEY`, `ACTIVE_TENANT_NAME_KEY`). No new keys.
**Scope**: per browser profile on web; per OS user on desktop. Never server-persisted.

### Shape (existing — no change)

| Field | Type | Required | Notes |
|---|---|---|---|
| `activeTenantId` | `string \| null` | required once hydrated | UUID of the tenant the UI is currently scoped to. Null only before hydration completes. |
| `activeTenantName` | `string \| null` | required once hydrated | Human-readable name used in the confirmation dialog and the selector label. |
| `tenantIds` | `string[]` | required | The full authorized tenant list for this user, synced from the JWT's `app_metadata.tenant_ids` on sign-in and on `hydrateActiveTenant()`. |

### Actions (existing — no change)

- `setActiveTenant(id: string, name: string): void` — called by `useTenantSwitch` **after** the confirmation dialog resolves Confirm. Never called directly from `<TenantSelector />` anymore.
- `hydrateActiveTenant(fallbackPrimary?: string): void` — called on app boot and on revoked-tenant recovery.

### Derivation rules

- On app boot: if `localStorage.activeTenantId` is set AND is still in `tenantIds`, keep it; else call `hydrateActiveTenant(tenantIds[0])`.
- On `tenantIds` update (sign-in, membership sync): if `activeTenantId` is no longer present, recover per R5.
- For single-tenant users (`tenantIds.length === 1`): `activeTenantId` is always equal to `tenantIds[0]`; the selector renders read-only.

### State transitions

```text
   (sign-out)  ─────► [uninitialized]  (activeTenantId = null)
                        │
             sign-in    │   tenantIds loaded from JWT
                        ▼
                  [hydrating]
                        │
             hydrate    │
                        ▼
                   [active]  (activeTenantId ∈ tenantIds)
                        │
             ┌──────────┤
             │          │
  switch (confirmed)    │  membership revoked
             │          │
             ▼          ▼
         [active]   [recovering] ──► [active] or [no-access]
```

### Validation

- `activeTenantId ∈ tenantIds` is an invariant. Violations trigger `hydrateActiveTenant()`.
- `activeTenantName` is always rendered; if stale vs. the tenants list, it's refreshed on the next `/api/tenants/selector` fetch.

---

## 2. Tenant Membership (read model, client-side projection)

**Owner**: `@ramcar/features` — `useTenantSelector()` already exposes this via the `tenants/selector` TanStack Query.
**Source of truth**: `public.user_tenants` joined to `public.tenants` on the API side (spec 020).
**No new fields**. This entry exists only to document that the feature *depends on* the existing projection — it does not modify it.

### Shape (existing)

| Field | Type | Notes |
|---|---|---|
| `id` | `string` (UUID) | Tenant id. |
| `name` | `string` | Display name. |
| `imagePath` | `string \| null` | Used by `<TenantAvatar />`. |
| `status` | `"active" \| "suspended"` | Suspended tenants are excluded from the selector list server-side. |

### Validation

- Server filters by `status = 'active'` (spec 020).
- The client treats the list as authoritative for selector contents; it never augments with `authSlice.tenantIds` because those two lists can diverge (a membership row existed but the tenant was suspended — the user should not see it in the switcher).

---

## 3. Bitacora View Tenant (view-local, URL-derived)

**Owner**: `apps/web/src/features/logbook/hooks/use-logbook-filters.ts`.
**Persistence**: URL query string `?tenant_id=<uuid|ALL>` — same as today (spec 019).
**Scope**: the Bitacora route only.

### Shape (existing — unchanged)

| Field | Type | Notes |
|---|---|---|
| `tenant_id` (query param) | `string \| "ALL"` | Authoritative filter for the Bitacora table. `"ALL"` is a super-admin-only sentinel (spec 019). |

### Derivation rules (new — this feature)

- **On module mount** with no URL `tenant_id`: seed from `activeTenantId`.
- **On `activeTenantId` change** while Bitacora is mounted (after a confirmed top-bar switch): overwrite `tenant_id` with the new `activeTenantId` via `router.replace()` (no history push). This satisfies FR-020.
- **On explicit user change** inside Bitacora (dropdown): the URL is updated to the new value; top-bar and `activeTenantId` are untouched (FR-013).
- **On module unmount**: no cleanup; on next mount the seeding rule fires afresh (FR-014).

### Validation

- `tenant_id` must be either a UUID present in `tenantIds`, or the string `"ALL"` for super-admin. Unknown ids fall back to `activeTenantId` and log a console warning.

### State transitions

```text
     (mount, URL param absent)  ─────► seed from activeTenantId
     (URL param set to UUID)          ─────► authoritative filter
     (user picks different tenant)    ─────► URL rewrites, top bar unchanged
     (top-bar switch confirmed)       ─────► URL rewrites to new activeTenantId
     (super-admin picks "ALL")        ─────► URL = "ALL", preserved until navigate away
```

---

## 4. Desktop Sync Outbox Row — `tenant_id` column (new)

**Owner**: `apps/desktop/electron/repositories/sync-outbox-repository.ts`.
**Storage**: SQLite, the desktop main-process database (`database.ts`).
**Persistence**: local disk, survives app restarts and offline periods until the row is successfully synced and removed.

### Current schema (spec 011, recap)

```sql
CREATE TABLE IF NOT EXISTS sync_outbox (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id      TEXT NOT NULL UNIQUE,        -- UUID, idempotent server reconciliation
  entity_type   TEXT NOT NULL,               -- e.g., 'visit_person', 'access_event'
  entity_id     TEXT,                        -- UUID of the entity being mutated
  action        TEXT NOT NULL,               -- 'create' | 'update' | 'delete'
  payload       TEXT NOT NULL,               -- JSON-serialized request body
  status        TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'syncing' | 'error'
  retry_count   INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_error    TEXT
);
```

### New column (this feature)

```sql
ALTER TABLE sync_outbox ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
```

Applied via a `PRAGMA user_version` bump inside `database.ts` at startup. Pre-existing rows (if any) are best-effort backfilled from `json_extract(payload, '$.tenant_id')`; rows where extraction yields NULL get `tenant_id = 'unknown'` and will be rejected by the API on flush (the row stays in the outbox with an error status and is surfaced to the user for re-capture).

### Field contract

| Field | Type | Notes |
|---|---|---|
| `tenant_id` | `TEXT NOT NULL` | UUID of the tenant that was active in the authSlice at the moment the row was enqueued. Must never be overwritten by later UI tenant switches (FR-010). |

### Invariants

- On enqueue: `tenant_id = authSlice.activeTenantId` (as-of enqueue). Captured by the SyncEngine in the single entry-point API used by all IPC mutation handlers.
- On flush: the SyncEngine reads the row's `tenant_id` and sends it as `X-Active-Tenant-Id`. The current UI activeTenantId is not consulted.
- If the API rejects the row with `TENANT_ACCESS_REVOKED` (e.g., the guard's membership was removed since capture), the row is moved to `status = 'error'` and the user is notified; it is not silently re-tagged.

### Lifecycle

```text
  capture (IPC handler)
      │
      │  stamp tenant_id = activeTenantId snapshot
      ▼
  sync_outbox row (status='pending', tenant_id=T)
      │
      │  SyncEngine drains
      ▼
  HTTP flush: headers include X-Active-Tenant-Id: T
      │
  ┌───┴───┐
  │       │
  2xx     403 TENANT_ACCESS_REVOKED
  │       │
  delete  mark status='error', surface to user
```

---

## 5. Unsaved-Forms Registry (web-only, client state)

**Owner**: `apps/web/src/shared/hooks/use-unsaved-forms-registry.ts` — a new small Zustand slice.
**Persistence**: in-memory only (not `localStorage`). Drafts themselves continue to persist via `useFormPersistence`; this registry is about "is a form currently mounted AND dirty right now?".
**Exposed via**: the `UnsavedChangesPort` adapter (web adapter implements it; desktop adapter is a stub returning `false`).

### Shape

| Field | Type | Notes |
|---|---|---|
| `dirtyFormIds` | `Set<string>` | Each mounted form generates a stable id (e.g., `"users:create"`, `"visit-persons:edit:<id>"`) and registers itself when dirty. |
| `register(id: string): void` | action | Called from `useRegisterUnsavedForm(isDirty)` when `isDirty` flips to true. |
| `deregister(id: string): void` | action | Called when `isDirty` flips to false, or on unmount. |
| `hasAny(): boolean` | selector | Used by the `UnsavedChangesPort` adapter to drive the confirmation-dialog copy. |

### Validation

- No cross-tenant concern: the registry tracks form-level UI state and is cleared on navigation away from the form (unmount cleanup).
- On sign-out, the slice is reset (same behavior as every other auth-scoped slice).

---

## Cross-feature consistency

- All query keys that touch tenant-scoped data include `activeTenantId` as the discriminant (see `contracts/endpoint-scoping-matrix.md` for the full list).
- The `useActiveTenant()` hook in `@ramcar/features` is the single read-side accessor for `activeTenantId`/`activeTenantName`/`tenantIds`. Feature code outside `packages/features` should never import `authSlice` directly; the adapter boundary holds.
- The desktop outbox and the web HTTP client both source the tenant from the **same** authSlice value (at enqueue time for desktop, at request time for web). There is never a case where the tenant used server-side was not first validated by the `TenantGuard` against the JWT's `tenant_ids`.

---

## Traceability

| Requirement | Modeled by |
|---|---|
| FR-001 / FR-004 | Active Tenant Selection §1 (single-tenant short-circuit) |
| FR-002 | Active Tenant Selection §1 (localStorage persistence) |
| FR-003 | Active Tenant Selection §1 (`hydrateActiveTenant` derivation) |
| FR-005..FR-009 | Wire header (see contracts/), server guard (see contracts/endpoint-scoping-matrix.md) |
| FR-010 | Desktop Outbox §4 (`tenant_id` column + invariants) |
| FR-011..FR-014, FR-020 | Bitacora View Tenant §3 (derivation rules) |
| FR-015..FR-019 | Confirmation dialog + Unsaved-Forms Registry §5 |
| FR-021..FR-024 | Server guard + single-tenant short-circuit §1 |
| FR-025 | Recovery flow (R5) — `hydrateActiveTenant` + 403 detection |
| FR-026..FR-027 | Server-side validation in guard + client-side key partitioning + `cancelQueries` |
