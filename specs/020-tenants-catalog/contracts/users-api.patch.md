# Users API — Contract Patch for 020-tenants-catalog

**Target endpoints**: `POST /api/users`, `PATCH /api/users/:id` (existing, introduced by specs 008/009).

**What changes**: The request DTO gains two fields for `admin` and `guard` roles: `tenant_ids` (array) and `primary_tenant_id`. The single `tenant_id` field is retained only for `resident` role. On submit, the API syncs `public.user_tenants` rows to exactly match the selected set.

---

## 1. Request body — discriminated on `role`

### 1.1 `role = "resident"` (unchanged shape)

```json
{
  "email": "jane@example.com",
  "full_name": "Jane Doe",
  "role": "resident",
  "tenant_id": "9c4b7f00-…"
}
```

Field rules: same as before (spec 008/009).

### 1.2 `role = "admin"` or `role = "guard"` (NEW shape)

```json
{
  "email": "guard42@example.com",
  "full_name": "Luis García",
  "role": "guard",
  "tenant_ids": ["9c4b7f00-…", "aa66ee11-…", "7733cc22-…"],
  "primary_tenant_id": "aa66ee11-…"
}
```

**Validation rules**:
- `tenant_ids`: `array<uuid>`, `minItems: 1`. Deduplicated server-side.
- `primary_tenant_id`: `uuid`. Must equal one of the entries in `tenant_ids` (Zod `.refine(v => v.tenant_ids.includes(v.primary_tenant_id))`). Otherwise 422 with `details[].path = ["primary_tenant_id"]`.
- `tenant_id` (legacy): MUST NOT be sent for admin/guard. If present, the API ignores it (does not fail) for forward compatibility with older clients, and logs once at warn.

**Authorization rules** (enforced in `UsersService`):
- Only SuperAdmin MAY submit `role = "admin"` (FR-056). Admins submitting `role = "admin"` get 403.
- Admins MAY submit `role = "guard"` only with `tenant_ids ⊆ actor.scope.tenantIds` (FR-055). Otherwise 403 with `details[].path = ["tenant_ids"]`.
- SuperAdmin MAY submit any `tenant_ids` subset.

### 1.3 `role = "super_admin"` (unchanged)

Tenant assignment fields ignored by the API. SuperAdmin is not populated in `user_tenants` (research R-3, spec FR-028).

---

## 2. Server-side behaviour: `UsersService.syncUserTenants`

Called as the last step of both `create` and `update`:

```ts
async syncUserTenants(params: {
  userId: string;
  role: Role;
  tenantIds: string[];
  primaryTenantId: string;
  actor: TenantScope;
}): Promise<void>;
```

**Steps**:

1. If `role === "resident"` → update `profiles.tenant_id` only; do NOT touch `user_tenants`.
2. If `role === "super_admin"` → do NOT touch `user_tenants`.
3. Else (`admin | guard`):
   1. If `actor.scope === "list"` assert `tenantIds.every(id => actor.tenantIds.includes(id))` else `ForbiddenException`.
   2. Assert `primaryTenantId ∈ tenantIds` (defense in depth; Zod already enforced).
   3. Open a transaction.
   4. `update profiles set tenant_id = primaryTenantId where user_id = $userId`.
   5. `delete from user_tenants where user_id = $userId and tenant_id <> all($tenantIds)`.
   6. `insert into user_tenants (user_id, tenant_id, assigned_by) select $userId, unnest($tenantIds), $actorUserId on conflict (user_id, tenant_id) do nothing`.
   7. Commit.

**Atomicity note**: A single Supabase transaction ensures the primary tenant on `profiles` and the `user_tenants` set commit together.

**Response**: The full `User` row (existing shape from spec 009) with the updated `tenantId = primaryTenantId`, and a new optional array `tenant_ids: string[]` that lists the synchronized set (empty for residents/super_admins).

---

## 3. Response type extension

```ts
// @ramcar/shared/types/user.ts — added field
export interface ExtendedUserProfile {
  // … existing fields …
  tenantIds: string[];    // NEW: full tenant assignments for admin/guard; [] for resident/super_admin
}
```

Residents: `tenantIds` = `[profiles.tenant_id]` for consistency with the JWT claim shape (so a resident UI can render a one-element tenant widget without special-casing).

SuperAdmin users viewed from the Users catalog: `tenantIds = []` (they are not populated in the join, and the UI shows them as "All tenants" in place of a tenant column).

---

## 4. Migration note for the Users form

The existing Users form (`apps/web/src/features/users/components/user-form.tsx`) renders a single-value dropdown bound to `tenant_id`. This feature replaces that field with a role-conditional widget:

- `role === "resident"` → existing single `Select` (behavior unchanged).
- `role ∈ { "admin", "guard" }` → new `TenantMultiSelect` (Command-based combobox with chips + primary radio). See §FR-050 through FR-056.
- `role === "super_admin"` → field hidden; UI shows a read-only "All tenants" badge.

The existing `useTenants()` hook in `apps/web/src/features/users/hooks/use-tenants.ts` (currently `GET /tenants` → returns `{ id, name }[]`) is **replaced** by the new selector-projection hook from the `tenants` feature (`apps/web/src/features/tenants/hooks/use-tenants.ts`), which returns richer entities including `image_path` and `status`. The old hook file is removed.

---

## 5. Breaking-change summary

| Surface | Before | After |
|---------|--------|-------|
| Create DTO for `admin`/`guard` | `{ …, tenant_id }` | `{ …, tenant_ids[], primary_tenant_id }` |
| Update DTO for `admin`/`guard` | `{ …, tenant_id? }` | `{ …, tenant_ids[]?, primary_tenant_id? }` |
| Response shape | `ExtendedUserProfile` (no `tenantIds`) | `ExtendedUserProfile + tenantIds: string[]` |
| Side effect | updates `profiles.tenant_id` only | updates `profiles.tenant_id` + syncs `user_tenants` rows |
| Authorization | single-tenant match | multi-tenant subset match (Admin scoped to own tenants) |

Consumers: the Users form in `apps/web` (updated in this PR). No other callers.
