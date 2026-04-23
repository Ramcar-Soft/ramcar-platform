# JWT Auth Hook — Claim Contract

**Purpose**: Define the Postgres function that augments every Supabase-issued JWT and the resulting `app_metadata` claim shape. This contract binds the migration, the NestJS `TenantGuard`, and the frontend `authSlice` hydration path.

---

## 1. Supabase config

`supabase/config.toml` — enable the custom access token hook:

```toml
[auth.hook.custom_access_token]
enabled = true
uri = "pg-functions://postgres/public/custom_access_token_hook"
```

Grant execution on the hook function to `supabase_auth_admin` so the auth service can invoke it:

```sql
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
```

---

## 2. Function signature

```sql
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id   uuid        := (event ->> 'user_id')::uuid;
  v_role      text;
  v_tenant_id uuid;
  v_tenant_ids jsonb;
  v_claims    jsonb       := coalesce(event -> 'claims', '{}'::jsonb);
  v_app_meta  jsonb       := coalesce(v_claims -> 'app_metadata', '{}'::jsonb);
begin
  -- Resolve role + primary tenant from profiles
  select p.role, p.tenant_id
    into v_role, v_tenant_id
  from public.profiles p
  where p.user_id = v_user_id;

  if v_role is null then
    -- User without a profile (should not happen post-bootstrap).
    v_role := 'resident';
    v_tenant_ids := '[]'::jsonb;
  elsif v_role = 'super_admin' then
    v_tenant_ids := to_jsonb('*'::text);
  elsif v_role = 'resident' then
    v_tenant_ids := jsonb_build_array(v_tenant_id);
  else
    -- admin or guard: read the join table
    v_tenant_ids := coalesce(
      (select jsonb_agg(ut.tenant_id order by ut.created_at)
         from public.user_tenants ut
        where ut.user_id = v_user_id),
      '[]'::jsonb
    );
  end if;

  -- Merge into app_metadata. Keep the legacy tenant_id during the rollout window.
  v_app_meta := v_app_meta
    || jsonb_build_object(
         'role',       v_role,
         'tenant_id',  v_tenant_id,  -- legacy / compat (R-12)
         'tenant_ids', v_tenant_ids
       );

  v_claims := v_claims || jsonb_build_object('app_metadata', v_app_meta);

  return event || jsonb_build_object('claims', v_claims);
end;
$$;
```

**Notes**:
- `security definer` is required so the hook can read `public.profiles` and `public.user_tenants` when invoked by `supabase_auth_admin`.
- `search_path = public` prevents a caller from injecting a malicious schema into resolved table references (standard SECURITY DEFINER hygiene).
- The function is **idempotent**: calling it with the same `event` twice produces the same output.
- Performance budget: one indexed point select on `profiles` + one indexed point select on `user_tenants`. Both `profiles.user_id` and `user_tenants.user_id` are indexed. Target < 30 ms p95 per token issuance.

---

## 3. Resulting JWT payload

After the hook runs, a decoded JWT carries:

```json
{
  "sub": "<auth.uid()>",
  "email": "jane@example.com",
  "role": "authenticated",
  "app_metadata": {
    "role": "admin",
    "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "tenant_ids": [
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
    ]
  },
  "user_metadata": { /* user-editable, unchanged */ },
  "exp": 1714060800,
  "iat": 1714057200
}
```

### Per-role examples

**SuperAdmin**:
```json
"app_metadata": {
  "role": "super_admin",
  "tenant_id": "00000000-…",
  "tenant_ids": "*"
}
```

**Admin / Guard assigned to 2+ tenants**:
```json
"app_metadata": {
  "role": "guard",
  "tenant_id": "aaaaaaaa-…",
  "tenant_ids": ["aaaaaaaa-…", "bbbbbbbb-…", "cccccccc-…"]
}
```

**Resident**:
```json
"app_metadata": {
  "role": "resident",
  "tenant_id": "aaaaaaaa-…",
  "tenant_ids": ["aaaaaaaa-…"]
}
```

**Admin with zero assignments** (post-mass-revocation):
```json
"app_metadata": {
  "role": "admin",
  "tenant_id": null,
  "tenant_ids": []
}
```
The API treats this as "no tenant scope" — tenant-scoped lists return empty, mutations return 403. The user regains access on reassignment + next token refresh (FR-026).

---

## 4. Consumer contracts

### 4.1 NestJS `TenantGuard`

Reads `request.authUser.app_metadata` and builds `request.tenantScope` via the mapping:

```ts
const { role, tenant_id, tenant_ids } = req.authUser.app_metadata ?? {};
const tenantIds = tenant_ids ?? (tenant_id ? [tenant_id] : []); // R-12 fallback during rollout
req.tenantScope = toScope(role, tenant_ids ?? tenantIds, tenant_id); // see data-model.md §3
```

### 4.2 Frontend `authSlice`

On sign-in / token refresh the frontend never reads the raw JWT. It reads `session.user.app_metadata` returned by `supabase.auth.getSession()` (or the server-side equivalent via `@supabase/ssr`). The slice populates:

```ts
const role = appMeta.role as Role;
const jwtTenantIds = appMeta.tenant_ids;

// For super_admin, resolve the concrete list from the API (never store "*" on the frontend)
const tenantIds = role === "super_admin"
  ? (await fetchAllTenants()).map((t) => t.id)
  : Array.isArray(jwtTenantIds) ? jwtTenantIds : [];

setTenantIds(tenantIds);
hydrateActiveTenant(appMeta.tenant_id /* primary */);
```

### 4.3 RLS policies

RLS expressions consume `auth.jwt() -> 'app_metadata' ->> 'role'` (text) and the caller's identity via `auth.uid()`. They DO NOT consume `tenant_ids` from the claim directly — they re-derive the set from `public.user_tenants` to avoid trusting a claim that could be stale relative to the DB state within a single request. This is defense in depth and costs one indexed read per RLS check.

**Why not trust the claim in RLS?** Two reasons:
1. The claim is set at token issue time; if a row was added/removed since, the claim is stale until refresh. Re-deriving in RLS keeps the DB authoritative.
2. `tenant_ids` as JSON in RLS requires `jsonb` parsing and membership via `jsonb @>` checks — functionally equivalent to `IN` but with more opaque query plans. The join against `user_tenants` keeps the query plan flat and index-friendly.

The API layer trusts the claim (spec Assumption) for cost reasons — most requests carry a fresh claim. RLS is the safety net.

---

## 5. Rollout sequence (one migration, one deploy)

```text
1. Apply migration:
   1a. Extend `public.tenants` with new columns.
   1b. Create `public.user_tenants` table + RLS policies.
   1c. Rewrite RLS policies on `profiles`, `vehicles`, `access_events`,
       `visit_persons`, `visit_person_images`, `tenants`.
   1d. Create `public.custom_access_token_hook` function + grant.
   1e. Create `tenant-images` storage bucket + storage policies.
   1f. Backfill `user_tenants` from existing admin/guard profiles.

2. Update supabase/config.toml to enable the hook.

3. Deploy API + web + desktop with:
   3a. New TenantGuard behavior (still accepts legacy `tenant_id`-only JWTs via R-12 fallback).
   3b. New /api/tenants endpoints.
   3c. Updated /api/users with multi-tenant sync.
   3d. New TopBar TenantSelector.
   3e. New authSlice fields.

4. Force no sessions to refresh — existing sessions naturally refresh within JWT TTL
   (~1h default). After 24h, confirm via log that no legacy JWT is still hitting
   the API.

5. Follow-up PR removes the R-12 fallback branch in TenantGuard.
```

---

## 6. Test matrix

| Scenario | Expected claim shape |
|---------|----------------------|
| Fresh sign-in as SuperAdmin | `tenant_ids = "*"`, `role = "super_admin"`, `tenant_id` = their own profile tenant (not functionally used) |
| Fresh sign-in as Admin with 3 assignments | `tenant_ids` is a 3-element UUID array sorted by `created_at asc` |
| Fresh sign-in as Guard with 0 assignments | `tenant_ids = []`, `role = "guard"` |
| Fresh sign-in as Resident | `tenant_ids = ["<profile.tenant_id>"]` |
| Orphan profile (no role set — bug scenario) | `tenant_ids = []`, `role = "resident"` (safe default) |
| Token refresh after a new `user_tenants` insert | New token reflects the inserted tenant |

These assertions go into `apps/api/test/integration/auth-hook.int-spec.ts` (new test file).
