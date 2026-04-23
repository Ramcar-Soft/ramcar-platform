# Phase 1 Data Model — 020-tenants-catalog

**Purpose**: Canonical schema, validation, and state definitions for the feature. Consumed by contracts (REST shape, Zod DTOs), the Supabase migration, RLS policy rewrites, and frontend type generation.

---

## 1. Entities

### 1.1 Tenant (`public.tenants`)

Extended in this feature. Pre-existing columns marked **(existing)**; new columns marked **(new)**.

| Column | Type | Null | Default | Notes |
|--------|------|------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK (existing). |
| `name` | `text` | NOT NULL | — | Display name, trimmed, 1–255 chars (existing). |
| `slug` | `text` | NOT NULL unique | — | URL-safe identifier, auto-generated from name (existing). |
| `time_zone` | `text` | NOT NULL | `'UTC'` | Olson TZ used by logbook/reports (existing, spec 019). |
| `address` | `text` | NOT NULL | `''` (empty) | **(new)** Required in the UI (non-empty trimmed); default `''` allows safe backfill of existing rows (FR-034, FR-035). |
| `status` | `text` | NOT NULL | `'active'` | **(new)** `check (status in ('active','inactive'))`. Controls visibility to non-SuperAdmin in the TopBar selector (FR-034, FR-047). |
| `config` | `jsonb` | NOT NULL | `'{}'::jsonb` | **(new)** Reserved; not rendered in v1 (FR-011 — not rendered; FR-034 — persisted). |
| `image_path` | `text` | NULL | `null` | **(new)** Object path inside the `tenant-images` Supabase Storage bucket (relative, e.g., `tenants/<id>/2026-04-23T10:12Z-7f2a.webp`). NULL means "use fallback avatar". (FR-035a) |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Existing. |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Maintained by `handle_updated_at` trigger (existing). |

**Indexes (new)**:

```sql
create index tenants_status_idx on public.tenants(status);
create index tenants_created_at_desc_idx on public.tenants(created_at desc);
```

**Validation (API + frontend, via `@ramcar/shared/validators/tenant.ts`)**:

| Field | Rule |
|-------|------|
| `name` | `z.string().trim().min(1).max(255)`. |
| `address` | `z.string().trim().min(1)` on create; on PATCH, optional but if present `.min(1)`. |
| `status` | `z.enum(["active", "inactive"])`. Only SuperAdmin may change it (FR-015). |
| `config` | `z.record(z.unknown()).default({})`. Not exposed in the UI. |
| `image_path` | Server-managed. Never accepted directly in JSON DTOs; only set via `POST /api/tenants/:id/image` or cleared via `DELETE /api/tenants/:id/image`. |

**State transitions**:

- `status` transitions: `active ↔ inactive`. Only SuperAdmin is authorized.
- Deactivation does **not** destroy data; residents keep reading their tenant's rows (FR edge case), admins/guards lose the option in the selector.
- Re-activation restores admin/guard operational access.

**Relationships**:
- 1 tenant → N `profiles` (each profile has exactly one primary tenant via `profiles.tenant_id`).
- 1 tenant → N `user_tenants` rows (admin/guard multi-assignment).
- 1 tenant → N tenant-scoped rows (`vehicles`, `access_events`, `visit_persons`, `visit_person_images`, `user_groups` is NOT tenant-scoped).

**RLS policies (rewritten)**:

```sql
-- Replaces "Users can read own tenant" from auth_schema migration.
create policy "Tenants read by role+scope"
  on public.tenants for select
  to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    or (
      (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'guard')
      and id in (
        select ut.tenant_id from public.user_tenants ut
        where ut.user_id = auth.uid()
      )
    )
    or (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'resident'
      and id = (
        select p.tenant_id from public.profiles p
        where p.user_id = auth.uid()
      )
    )
  );

-- SuperAdmin full CRUD; Admin PATCH within their assigned set (row-level). Insert handled by RPC/service that re-checks.
create policy "Tenants insert by super_admin and admin"
  on public.tenants for insert
  to authenticated
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('super_admin', 'admin')
  );

create policy "Tenants update by role+scope"
  on public.tenants for update
  to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    or (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      and id in (
        select ut.tenant_id from public.user_tenants ut where ut.user_id = auth.uid()
      )
    )
  )
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    or (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      and id in (
        select ut.tenant_id from public.user_tenants ut where ut.user_id = auth.uid()
      )
    )
  );

-- No delete policy — hard delete is out of scope (spec §Out of Scope).
```

---

### 1.2 Profile (`public.profiles`)

No schema change. Semantic role change:

- `tenant_id` remains the user's **primary tenant**. For residents it is the only tenant; for admins/guards it is a tiebreaker / default-active choice (spec §Key Entities). FK preserved.
- `role` gates how the auth hook computes `tenant_ids` (see §4 Auth Hook Claims).

**RLS policies (rewritten to the three-branch form for every tenant-scoped predicate)**:

```sql
-- Replace "Users can read profiles in own tenant" (auth_schema) +
--         "Users can read profiles in scope" (users_module).
drop policy if exists "Users can read profiles in own tenant" on public.profiles;
drop policy if exists "Users can read profiles in scope" on public.profiles;

create policy "Profiles read by role+scope"
  on public.profiles for select
  to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    or (
      (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'guard')
      and tenant_id in (
        select ut.tenant_id from public.user_tenants ut where ut.user_id = auth.uid()
      )
    )
    or (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'resident'
      and tenant_id = (
        select p.tenant_id from public.profiles p where p.user_id = auth.uid()
      )
    )
  );

-- Same three-branch shape replaces "Admins can insert/update profiles in own tenant" /
--                                   "Admins can update profiles in scope".
-- 'Users can update own profile' (self-update) is kept unchanged — it does not depend on tenant_id.
```

### 1.3 UserTenant (`public.user_tenants`) **— NEW**

```sql
create table public.user_tenants (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  assigned_by uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  unique (user_id, tenant_id)
);

create index user_tenants_user_id_idx on public.user_tenants(user_id);
create index user_tenants_tenant_id_idx on public.user_tenants(tenant_id);

alter table public.user_tenants enable row level security;
```

**Field notes**:

| Column | Type | Null | Notes |
|--------|------|------|-------|
| `id` | uuid | NOT NULL | Synthetic PK, enables PATCH/DELETE by id. |
| `user_id` | uuid | NOT NULL | FK `auth.users(id)` ON DELETE CASCADE. |
| `tenant_id` | uuid | NOT NULL | FK `public.tenants(id)` ON DELETE CASCADE. |
| `assigned_by` | uuid | NOT NULL | FK `auth.users(id)`. No cascade — historical audit even if assigner is deleted? Spec doesn't require audit retention; keeping FK without cascade means DELETE-cascade from `auth.users` covers assigner rows too implicitly because the row being deleted is the assigner — no-op for other rows. Effectively the assigner's own rows get cleaned up when the assigner is deleted. |
| `created_at` | timestamptz | NOT NULL | `default now()`. |

**Uniqueness**: `(user_id, tenant_id)` — a user cannot be assigned to the same tenant twice. Violation returns 409.

**Never populated for residents** (FR-028). An application-level check in `UsersService.syncUserTenants` raises if called with `role='resident'`.

**RLS policies**:

```sql
-- Super_admin: full CRUD.
create policy "User_tenants superadmin full"
  on public.user_tenants for all
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Admin: read own rows + read rows inside their assigned tenants (they need to see who else is assigned).
create policy "User_tenants admin read"
  on public.user_tenants for select
  to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and (
      user_id = auth.uid()
      or tenant_id in (
        select ut.tenant_id from public.user_tenants ut where ut.user_id = auth.uid()
      )
    )
  );

-- Admin: insert rows linking guard/new-admin users to tenants inside their assigned set.
create policy "User_tenants admin insert"
  on public.user_tenants for insert
  to authenticated
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and tenant_id in (
      select ut.tenant_id from public.user_tenants ut where ut.user_id = auth.uid()
    )
  );

-- Admin: delete assignments inside their assigned tenants.
create policy "User_tenants admin delete"
  on public.user_tenants for delete
  to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and tenant_id in (
      select ut.tenant_id from public.user_tenants ut where ut.user_id = auth.uid()
    )
  );

-- Guards and Residents: no access (deny by default — no policy enables them).
```

**Backfill migration**:

```sql
insert into public.user_tenants (user_id, tenant_id, assigned_by)
select p.user_id, p.tenant_id, p.user_id
from public.profiles p
where p.role in ('admin', 'guard') and p.tenant_id is not null
on conflict (user_id, tenant_id) do nothing;
-- assigned_by = user_id is a sentinel for legacy rows (user is their own assigner).
```

---

### 1.4 Tenant-scoped entities (no schema change, RLS rewrite only)

`public.vehicles`, `public.access_events`, `public.visit_persons`, `public.visit_person_images` — every policy currently filtering by `tenant_id = (auth.jwt()->'app_metadata'->>'tenant_id')::uuid` is rewritten to the three-branch form identical in shape to the `profiles` policy above (substitute the table's `tenant_id` reference where needed). See research.md §R-16 for the enumeration.

---

## 2. JWT Claim Contract

The Supabase Auth custom access token hook attaches the following under `app_metadata`:

| Claim | Type | Value |
|-------|------|-------|
| `role` | `"super_admin" \| "admin" \| "guard" \| "resident"` | From `profiles.role`. |
| `tenant_id` | `string (uuid)` | **Legacy / compat field** — retained for the rollout window (research R-12). Equals `profiles.tenant_id` for all roles. |
| `tenant_ids` | `"*" \| string[]` | New. See below. |

**`tenant_ids` computation** (research R-3 pseudocode):

| `role` | `tenant_ids` value |
|--------|--------------------|
| `super_admin` | Literal string `"*"` (wildcard). |
| `admin` or `guard` | `uuid[]` from `select array_agg(tenant_id) from public.user_tenants where user_id = <current user>` (empty array permitted — FR-026). |
| `resident` | One-element array `[profiles.tenant_id]`. |

**Size bound**: Up to 50 UUIDs per array (FR-060) yields ≈ 1.8 kB of JWT payload — well under Supabase's ~4 kB practical limit for cookies-based sessions.

---

## 3. API Tenant Scope Discriminated Union

The internal API representation extracted by `TenantGuard` and consumed by `@CurrentTenant()`:

```ts
export type TenantScope =
  | { readonly role: "super_admin"; readonly scope: "all" }
  | { readonly role: "admin" | "guard"; readonly scope: "list"; readonly tenantIds: readonly string[] }
  | { readonly role: "resident"; readonly scope: "single"; readonly tenantId: string };
```

**Mapping from JWT claim to `TenantScope`**:

```ts
function toScope(role: Role, tenantIds: "*" | string[], legacyTenantId?: string): TenantScope {
  if (role === "super_admin" || tenantIds === "*") return { role: "super_admin", scope: "all" };
  if (role === "resident") {
    const id = Array.isArray(tenantIds) && tenantIds[0] ? tenantIds[0] : legacyTenantId;
    if (!id) throw new UnauthorizedException("resident without tenant");
    return { role: "resident", scope: "single", tenantId: id };
  }
  const ids = Array.isArray(tenantIds) ? tenantIds : legacyTenantId ? [legacyTenantId] : [];
  return { role, scope: "list", tenantIds: ids };
}
```

**Predicate helpers** (used in repositories):

```ts
type ScopedQuery = SupabaseQueryBuilder<"tenants", Row>;

function applyTenantScope(q: ScopedQuery, scope: TenantScope, column = "tenant_id"): ScopedQuery {
  if (scope.scope === "all") return q;
  if (scope.scope === "single") return q.eq(column, scope.tenantId);
  return q.in(column, [...scope.tenantIds]);
}
```

**Target-validation helper** (used by `TenantGuard`):

```ts
function assertTargetAllowed(scope: TenantScope, targetTenantId: string): void {
  if (scope.scope === "all") return;
  if (scope.scope === "single" && scope.tenantId === targetTenantId) return;
  if (scope.scope === "list" && scope.tenantIds.includes(targetTenantId)) return;
  throw new ForbiddenException();
}
```

---

## 4. Frontend State (Zustand `authSlice`)

```ts
import type { StateCreator } from "zustand";
import type { UserProfile } from "@ramcar/shared";

export interface AuthSlice {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // NEW — tenant scoping
  tenantIds: string[];         // resolved list (super_admin: full list from GET /api/tenants)
  activeTenantId: string;      // persisted to localStorage[ramcar.auth.activeTenantId]
  activeTenantName: string;    // looked up from tenant list at set time

  setUser: (user: UserProfile) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;

  // NEW actions
  setTenantIds: (ids: string[]) => void;
  setActiveTenant: (id: string, name: string) => void;  // persists id; invalidates React Query
  hydrateActiveTenant: (fallback: string) => void;      // read localStorage; validate against tenantIds
}
```

**Invariants**:

- `activeTenantId ∈ tenantIds` after hydration, OR `activeTenantId === ""` (user with no assignments).
- Residents MUST have `tenantIds.length === 1` and `activeTenantId === tenantIds[0]`.
- SuperAdmin receives the full tenant list from `GET /api/tenants` (resolved after login), NOT the `"*"` wildcard (that stays server-side).

**Persistence**:

- `activeTenantId` → `localStorage.setItem("ramcar.auth.activeTenantId", id)` on every `setActiveTenant` call.
- `activeTenantId` read on store hydration via `hydrateActiveTenant(profiles.tenant_id)`; if stored id is not in `tenantIds`, fall back to `profiles.tenant_id`, else `tenantIds[0]`, else `""`.
- Never stored: `tenantIds`, `activeTenantName` — recomputed on each session.

**Selector visibility rule**: `tenantIds.length >= 2` (FR-043). Residents never meet this because FR-027 enforces a single-element array.

---

## 5. Open validation rules by layer

| Concern | Layer | Rule |
|---------|-------|------|
| `name` non-empty trimmed | Zod `createTenantSchema` + NestJS pipe | `z.string().trim().min(1)`. |
| `address` non-empty trimmed | Zod | Same. |
| `status` transition `active ↔ inactive` only by SuperAdmin | API `TenantsService.update` | Reject 422/403 if Admin sends a status change (FR-015). |
| Admin may only PATCH tenants in scope | `TenantGuard` + `TenantsService.update` | `assertTargetAllowed(scope, :id)` in guard; service re-checks for defense in depth. |
| Admin create → auto-assign | `TenantsService.create` (transaction) | Insert tenant + `user_tenants` row atomically. |
| Image MIME ∈ {jpeg,png,webp} | Frontend `TenantImageUpload` pre-check + API `FileInterceptor.fileFilter` + Supabase bucket config | All three layers. |
| Image size ≤ 2 MiB | Same three layers. | |
| Primary tenant ∈ selected tenants (user form) | Zod `createUserSchema` / `updateUserSchema` `.refine` | Rejects with `path: ["primaryTenantId"]`. |
| Multi-select admin: can only assign to own tenants | API `UsersService.syncUserTenants` | `requestedIds.every(id => actorScope.tenantIds.includes(id))`; else 403. |
| Admin cannot create `role='admin'` | API `UsersService.create` | Check `actor.role === 'super_admin' || input.role !== 'admin'` (FR-056). |
| Residents never populate `user_tenants` | API `UsersService.syncUserTenants` | Assert `role !== 'resident'`. |

---

## 6. Supabase Storage — `tenant-images` bucket schema

| Property | Value |
|----------|-------|
| Name | `tenant-images` |
| Public | `true` |
| File size limit | `2097152` (bytes) |
| Allowed MIME types | `image/jpeg, image/png, image/webp` |
| Object path convention | `tenants/<tenant_id>/<ISO-timestamp>-<6-hex>.<ext>` |
| SELECT (read) | allow all (public URL) |
| INSERT / UPDATE / DELETE | allowed only when role=super_admin, OR role=admin AND the path prefix's `tenant_id` is in `user_tenants.tenant_id` for the caller |

**Storage policy expressed as SQL** (applied to `storage.objects` scoped to `bucket_id = 'tenant-images'`):

```sql
create policy "Tenant images: public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'tenant-images');

create policy "Tenant images: write by super_admin"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'tenant-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  )
  with check (
    bucket_id = 'tenant-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

create policy "Tenant images: write by admin within assigned tenants"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'tenant-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and (storage.foldername(name))[2]::uuid in (   -- 'tenants/<tenant_id>/...' → index 2
      select ut.tenant_id from public.user_tenants ut where ut.user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'tenant-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and (storage.foldername(name))[2]::uuid in (
      select ut.tenant_id from public.user_tenants ut where ut.user_id = auth.uid()
    )
  );
```

---

## 7. Entity relationship diagram

```text
  auth.users ──┬───────< public.profiles (tenant_id FK → tenants.id)
               │                │ role: super_admin | admin | guard | resident
               │                │
               └──< public.user_tenants >── public.tenants
                        (user_id)                  (tenant_id)
                        assigned_by → auth.users

  public.tenants (1) ── (N) public.{vehicles, access_events, visit_persons, visit_person_images}
                         │
                         └── image_path → storage.objects (bucket: tenant-images)
```

Legend: `<` = many-to-one, `>` = one-to-many, `──` = FK.

---

## 8. Change summary vs. current schema

| Artifact | Current | After this feature |
|----------|---------|--------------------|
| `public.tenants` columns | `id, name, slug, created_at, updated_at, time_zone` | `+ address, + status, + config, + image_path` |
| `public.tenants` indexes | `slug unique` | `+ status_idx, + created_at_desc_idx` |
| `public.user_tenants` | — | NEW table (see §1.3) |
| JWT `app_metadata` | `tenant_id, role` | `+ tenant_ids ("*" \| uuid[])` (legacy `tenant_id` kept for rollout) |
| `@CurrentTenant()` return | `string` | Discriminated `TenantScope` union (§3) |
| `TenantGuard` responsibility | Populate `request.tenantId` from JWT | Populate `request.tenantScope` + validate any incoming tenant target |
| Storage buckets | `visit-person-images` (private) | `+ tenant-images` (public) |
| `authSlice` shape | `user, isLoading, isAuthenticated` | `+ tenantIds, + activeTenantId, + activeTenantName, + setTenantIds, + setActiveTenant, + hydrateActiveTenant` |
| RLS policies rewritten | n/a | `tenants`, `profiles`, `vehicles`, `access_events`, `visit_persons`, `visit_person_images` (7 tables, ~12 policies) |
