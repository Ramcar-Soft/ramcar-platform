# UI Contract: Tenant Selector Visibility

**Spec**: 024 | **Story**: User Story 1 | **Requirements**: FR-001, FR-002, FR-003, FR-004, FR-024, FR-025

This document is the wire-level contract for the shared `<TenantSelector />` component, consumed identically by `apps/web` and `apps/desktop`. It supersedes the visibility behavior defined in spec 020 and the single-tenant-static-display branch added in spec 021 (`tenantIds.length <= 1`). The static branch is widened to also cover non-SuperAdmin roles.

---

## Component: `<TenantSelector />`

**Location**: `packages/features/src/tenant-selector/components/tenant-selector.tsx`

**Props**: unchanged from spec 020 — `{ supabaseUrl?: string }`.

**Inputs (from adapters/store)**:

| Source | Field | Notes |
|--------|-------|-------|
| `useRole()` | `role: Role` | One of `"SuperAdmin" \| "Admin" \| "Guard" \| "Resident"`. |
| `useAuthStore()` | `tenantIds: string[]` | From JWT claim. |
| `useAuthStore()` | `activeTenantId: string` | From spec 021. Persisted to `localStorage`. |
| `useAuthStore()` | `activeTenantName: string` | From spec 021. |
| `useAuthStore()` | `setActiveTenant(id, name)` | Used by deterministic tiebreak (R6). |
| `useTenantList()` | `data: Tenant[]` | From `GET /api/tenants` (existing). |

---

## Render branches

The component uses `canShowTenantSelector(role)` (data-model.md §2.1) to pick a render branch.

### Branch A: `canShowTenantSelector(role) === true` (SuperAdmin only)

**Pre-existing behavior, unchanged**: render the Popover-based combobox with the tenant list, plus the `<ConfirmSwitchDialog />` from spec 021.

```text
[Trigger button: avatar + active-tenant-name + chevron]
   ↓ (clicked)
[Popover: search input + scrollable Command list]
[Item per tenant: avatar + name + status-badge (if inactive) + check (if active)]
   ↓ (item selected)
[ConfirmSwitchDialog appears → onConfirm calls setActiveTenant + invalidates queries]
```

### Branch B: `canShowTenantSelector(role) === false` (Admin, Guard, Resident)

Render the existing static span (already used today for `tenantIds.length <= 1`):

```tsx
<span className="flex items-center gap-2 px-2 text-sm font-medium">
  {activeTenant ? (
    <TenantAvatar
      name={activeTenant.name}
      slug={activeTenant.slug}
      imagePath={activeTenant.image_path}
      supabaseUrl={supabaseUrl}
      size="sm"
    />
  ) : null}
  <span className="truncate">{activeTenantName || activeTenant?.name}</span>
</span>
```

The static span has:
- No `<button>`, no `role="combobox"`, no `aria-expanded`.
- No `<Popover>`, no `<Command>` tree.
- No keyboard activation (no Space/Enter handler).
- No click handler.
- No `<ConfirmSwitchDialog />` mount (would have nothing to confirm).

A screen reader announces the avatar + tenant name as plain content; assistive tech does not advertise it as an interactive control.

### Branch B + `tenantIds.length === 0` (edge case)

If the user has no authorized tenants, render either an empty static span or the existing "no access" state inherited from spec 021's empty-tenant rendering. This contract does not change that empty state; it only specifies that the selector itself does not become interactive.

---

## Deterministic "current tenant" reconciliation (Branch B only)

**Where**: existing `useEffect` at `tenant-selector.tsx:39-45`. Widened.

**When**: every time the `tenants` list resolves OR `tenantIds` / `activeTenantId` changes.

**What**:
```text
IF role === "SuperAdmin":
   → no-op (the user is allowed to switch; respect their stored choice)

ELSE IF tenants.length === 0:
   → no-op (waiting for resolution; or no access state)

ELSE:
   1. Let candidate = activeTenantId IF activeTenantId ∈ tenantIds AND tenants.find(t => t.id === activeTenantId)
   2. ELSE candidate = profilesTenantId IF profilesTenantId ∈ tenantIds AND tenants.find(t => t.id === profilesTenantId)
   3. ELSE candidate = [...tenants].sort((a, b) => a.name.localeCompare(b.name))[0]?.id
   4. Let candidateName = tenants.find(t => t.id === candidate)?.name ?? ""
   5. IF candidate AND (candidate !== activeTenantId OR candidateName !== activeTenantName):
        → setActiveTenant(candidate, candidateName)
```

The reconciliation is idempotent: re-runs on the same inputs do not call `setActiveTenant` because step 5 short-circuits. No infinite loop.

`profilesTenantId` is sourced from `useAppStore((s) => s.user?.tenantId)` via the host wrapper; the shared component does not directly read it. If the host adapter does not provide it, the rule falls through to step 3 (sort-by-name).

---

## Browser-level invariants

These hold across both apps and all routes.

| Invariant | Verification |
|-----------|--------------|
| For Admin / Guard / Resident, no element with `role="combobox"` or `aria-expanded` exists in the top bar. | E2E DOM assertion — `document.querySelector('header [role="combobox"]') === null`. |
| For SuperAdmin, exactly one such element exists. | E2E DOM assertion. |
| `localStorage["ramcar.auth.activeTenantId"]` after sign-in for Admin/Guard with `tenant_ids = [t1]` equals `t1`. | E2E. |
| For Admin with `tenant_ids = [t1, t2]` (legacy) and `profiles.tenant_id = t2`, after the tenants list resolves, `activeTenantId === t2`. | Vitest unit test on the reconciliation rule. |
| For Admin with `tenant_ids = [t2, t1]` and no valid `profiles.tenant_id`, after the tenants list resolves, `activeTenantId` equals the first ID by tenant name (locale-aware sort). | Vitest unit test. |

---

## Test plan

| Layer | File | Cases |
|-------|------|-------|
| Unit | `packages/features/src/tenant-selector/policy/policy.test.ts` | `canShowTenantSelector` × 4 roles. |
| Component | `packages/features/src/tenant-selector/__tests__/tenant-selector.test.tsx` | Branch A render for SuperAdmin (popover present); Branch B render for Admin/Guard/Resident (static span; no combobox); reconciliation: Admin with multi-id + valid profilesTenantId picks profilesTenantId; Admin with multi-id + invalid profilesTenantId picks alpha-first by tenant name. |
| E2E (web) | `apps/web/e2e/tenant-selector-visibility.spec.ts` | Three sign-ins (Admin one tenant, SuperAdmin, Guard one tenant); DOM assertions per Browser-level invariants. |
| E2E (desktop) | `apps/desktop/e2e/tenant-selector-visibility.spec.ts` (or Vitest+JSDOM) | Guard sign-in; same DOM assertion. |

---

## Backwards compatibility

- SuperAdmin behavior is unchanged from spec 021 (FR-021 / FR-005 in this spec).
- Pre-existing `localStorage["ramcar.auth.activeTenantId"]` for an Admin/Guard who is now single-tenant remains valid; if the stored id is no longer in `tenant_ids`, the reconciliation rule replaces it on next render.

## Out of scope

- Force-refreshing the JWT when `tenant_ids` changes (covered by spec 020 sign-in/refresh).
- Forcing a sign-out when an Admin is demoted (covered by existing role-guard unauthorized routing).
- Adding a "no tenants available" empty state (already exists from spec 021).
