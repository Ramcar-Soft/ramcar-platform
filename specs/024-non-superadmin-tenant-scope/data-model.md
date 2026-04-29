# Phase 1 Data Model: Single-Tenant UI Scope for Admins and Guards

**Branch**: `024-non-superadmin-tenant-scope` | **Date**: 2026-04-29

This feature does not introduce or modify any persisted entity. There are no new database tables, no new columns, no new RLS policies, and no new SQLite columns. The "data model" here documents the **UI-side state shapes** the feature reads and the three pure functions that encode the v1 product policy. All three are runtime computations off the existing JWT claims and the existing tenants list.

---

## 1. Existing entities consumed (read-only, no change)

### 1.1 `Role` (TypeScript union)

Source: `packages/shared/src/types/auth.ts`

```ts
export type Role = "super_admin" | "admin" | "guard" | "resident";
```

The shared selector's role adapter (`packages/features/src/adapters/role.tsx`) maps these to the cased form `"SuperAdmin" | "Admin" | "Guard" | "Resident"` for use inside the shared module. The cased form is what the new policy functions consume.

**Used by**: all three policy functions (R1).

### 1.2 `AuthSlice` (Zustand)

Source: `packages/store/src/slices/auth-slice.ts`

Fields read by this feature (no writes added):
- `tenantIds: string[]` — set of tenant UUIDs the JWT authorizes.
- `activeTenantId: string` — the active tenant per spec 021. For Admin/Guard in v1, equal to the deterministic "current tenant" (R6).
- `activeTenantName: string` — display name for the active tenant.
- `user: UserProfile | null` — has `role` and `tenantId` (the user's `profiles.tenant_id` — used as the deterministic preferred tenant per FR-003).

No new fields. No new actions. No persistence change.

### 1.3 `Tenant` (API response shape)

Source: `apps/web/src/features/tenants/types.ts` (and the repository result returned by `GET /api/tenants`)

```ts
export interface Tenant {
  id: string;
  name: string;
  slug: string | null;
  status: "active" | "inactive";
  image_path: string | null;
  // ...other fields irrelevant to this feature
}
```

**Used by**:
- The selector's deterministic tiebreak (R6) — needs `id` and `name`.
- The Tenants-table create gating (R3) — needs only the array length.
- The user-form tenant `<Select>` — needs `id` and `name` (existing usage).

### 1.4 `ExtendedUserProfile` (form initial data)

Source: `packages/shared/src/types/user.ts`

Fields read by the v1 form (existing):
- `tenantId: string` — the user's `profiles.tenant_id` (primary tenant).
- `tenantIds: string[]` — multi-tenant set (legacy from spec 020). On edit, the v1 form initialization picks a single tenant from this set; on save, the form writes back exactly one tenant value.

No schema change.

---

## 2. New runtime data: the three policy functions

These functions are the entire data-model contribution of this feature. They are deterministic, side-effect-free, and depend only on the inputs.

### 2.1 `canShowTenantSelector(role)`

```ts
export function canShowTenantSelector(role: Role): boolean {
  return role === "SuperAdmin";
}
```

| Input | Output |
|-------|--------|
| `"SuperAdmin"` | `true` |
| `"Admin"` | `false` |
| `"Guard"` | `false` |
| `"Resident"` | `false` |

**Consumers**: `packages/features/src/tenant-selector/components/tenant-selector.tsx` — when `false`, the component returns the static span (no Popover).

**Future extension point**: when subscription tiers ship, replace `role === "SuperAdmin"` with `tier?.allowsMultiTenantUI ?? role === "SuperAdmin"` (or similar). One file, one line.

### 2.2 `canCreateAnotherTenant(role, existingTenantsCount)`

```ts
export function canCreateAnotherTenant(role: Role, existingTenantsCount: number): boolean {
  if (role === "SuperAdmin") return true;
  if (role === "Admin") return existingTenantsCount === 0;
  return false;
}
```

| Role | `existingTenantsCount = 0` | `existingTenantsCount = 1` | `existingTenantsCount > 1` |
|------|----------------------------|----------------------------|----------------------------|
| SuperAdmin | `true` | `true` | `true` |
| Admin | `true` | `false` | `false` |
| Guard | `false` | `false` | `false` |
| Resident | `false` | `false` | `false` |

**Consumers**: `apps/web/src/features/tenants/components/tenants-table.tsx` — when `true`, `handleCreate` opens the Sheet; when `false`, opens the ContactSupportDialog.

The Guard / Resident `false` rows are defensive — those roles have no Tenants-catalog access via the navigation shell (sidebar-config) and no API permission. The function returns `false` for completeness so a misconfigured nav cannot accidentally enable the Sheet.

**Future extension point**: replace the literal `0` with a tier-derived `maxTenantsPerAccount` (subscription tier) or with `permissions.canCreateAdditionalTenants` (per-account permission flag). One file.

### 2.3 `canEditUserTenantField(role)`

```ts
export function canEditUserTenantField(role: Role): boolean {
  return role === "SuperAdmin";
}
```

| Input (creator's role) | Output |
|------------------------|--------|
| `"SuperAdmin"` | `true` |
| `"Admin"` | `false` |
| `"Guard"` | n/a (Guards cannot create users) |
| `"Resident"` | n/a (Residents cannot create users) |

**Consumers**: `apps/web/src/features/users/components/user-form.tsx` — when `false`, the tenant `<Select>` is rendered with `disabled` and the value pre-filled to the creator's `activeTenantId`.

**Future extension point**: same shape as 2.1 — single-line replacement when tiers ship.

---

## 3. Computed value: deterministic "current tenant"

Per FR-003 and R6, the current tenant for an Admin or Guard is computed as follows:

```text
INPUTS:
  tenantIds:           string[]           // from JWT claim
  profilesTenantId:    string | undefined // from auth-slice user.tenantId
  tenants:             Tenant[]           // resolved from GET /api/tenants
  activeTenantId:      string             // current value in auth-slice

OUTPUT:
  currentTenantId: string

RULE:
  1. If activeTenantId ∈ tenantIds AND a matching Tenant exists in tenants:
       → return activeTenantId  (no change)

  2. Otherwise, if profilesTenantId ∈ tenantIds AND a matching Tenant exists:
       → return profilesTenantId

  3. Otherwise, sort tenants by name (locale-aware ascending) and return tenants[0].id

  4. If tenants is empty:
       → return ""  (no-access state, handled by existing empty rendering)
```

**Where it runs**: inside the existing `useEffect` in `tenant-selector.tsx` that already syncs `activeTenantName` from the fetched tenant list. The added behavior calls `setActiveTenant(currentId, currentName)` whenever the computed value differs from the current `activeTenantId`. The selector is mounted on every authenticated page on both apps, so this converges across the entire UI without a separate bootstrap path.

**Idempotence**: Re-running the computation against the same inputs always produces the same output. Race-free: `setActiveTenant` is a no-op when the value is unchanged (Zustand reference equality).

**Persistence**: The selected `currentTenantId` is persisted via the existing `setActiveTenant` localStorage write (auth-slice.ts:58-62). On the next reload, `hydrateActiveTenant` reads it back; the selector reconciliation re-runs and either accepts it or replaces it per the rule above.

**Out of scope**: The computation is deliberately stateless beyond what the auth slice already persists. There is no new "currentTenant" entity in the store.

---

## 4. Data flow summary

```text
┌─────────────────────────┐    ┌───────────────────────────┐
│   JWT (existing)        │    │   GET /api/tenants        │
│   - role                │    │   (existing endpoint)     │
│   - tenant_ids          │    │   returns Tenant[]        │
│   - profiles.tenant_id  │    └─────────────┬─────────────┘
└────────────┬────────────┘                  │
             │                               │
             ▼                               ▼
   ┌──────────────────┐           ┌────────────────────────┐
   │ Zustand authSlice│           │ TanStack Query cache   │
   │  - tenantIds     │           │  ["tenants", filters]  │
   │  - activeTenantId│           └────────────┬───────────┘
   │  - user.role     │                        │
   │  - user.tenantId │                        │
   └────────┬─────────┘                        │
            │                                  │
            └─────────────┬────────────────────┘
                          │
                          ▼
            ┌──────────────────────────┐
            │  Three policy functions  │
            │  (pure, no React)        │
            └────────────┬─────────────┘
                         │
       ┌─────────────────┼──────────────────────┐
       ▼                 ▼                      ▼
 TenantSelector    TenantsTable.handleCreate    UserForm tenant <Select>
 (hide popover)    (Sheet vs Dialog)            (locked vs free)
```

No write paths. No persistence beyond the existing `localStorage` keys from spec 021. No new TanStack Query keys. No new Zustand slices.

---

## 5. State transitions

The feature does not introduce stateful entities; this section is N/A. The closest thing to a "transition" is:

- **First tenant created by an Admin** → `useTenants` is invalidated → next `handleCreate` reads the new count → `canCreateAnotherTenant("Admin", 1)` returns `false` → ContactSupportDialog opens. (FR-012, R3)

This transition is enforced entirely by reading fresh API data; no new state machine.
