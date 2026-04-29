# Phase 0 Research: Single-Tenant UI Scope for Admins and Guards

**Branch**: `024-non-superadmin-tenant-scope` | **Date**: 2026-04-29

This document resolves the open design questions that arose while filling Technical Context. There are no `NEEDS CLARIFICATION` markers in plan.md — the spec is unusually concrete. Research below focuses on **how** to express the v1 rules so they can be cleanly removed by a future tier/permission feature (FR-025 / SC-008), not on what the rules are.

---

## R1 — Where do the three v1 rules live?

**Decision**: Three pure functions in a new `packages/features/src/tenant-selector/policy/` namespace, each in its own file, exported through a barrel.

```ts
// can-show-tenant-selector.ts
export function canShowTenantSelector(role: Role): boolean {
  return role === "SuperAdmin";
}

// can-create-another-tenant.ts
export function canCreateAnotherTenant(role: Role, existingTenantsCount: number): boolean {
  if (role === "SuperAdmin") return true;
  if (role === "Admin") return existingTenantsCount === 0;
  return false;
}

// can-edit-user-tenant-field.ts
export function canEditUserTenantField(role: Role): boolean {
  return role === "SuperAdmin";
}
```

**Rationale**:
- **One concern per file** so a future PR replacing `role === "SuperAdmin"` with `tier.allowsMultiTenantUI` touches three small bodies. SC-008 sets the bar at "no more than three files per concern."
- **Pure** — no React, no Zustand, no transport. The functions are unit-testable (Vitest in the same folder) and embeddable in any host.
- **Co-located with the selector** because the selector is the most prominent consumer; a developer looking for "where is this rule?" finds it next to the component that uses it.
- **Naming convention** — `can*` prefix mirrors the existing `canModifyUser` / `canEdit` shape from `@ramcar/shared/types/user.ts`. Engineers already grep for `canModifyUser`; the same instinct will surface these.

**Alternatives considered**:
- *A single `tenant-policy.ts` file with all three functions* — rejected: when the future feature replaces one rule but not another, a per-file diff is cleaner; also makes it obvious which rules have been migrated to the new system.
- *Hooks (`useCanCreateAnotherTenant`)* — rejected: adds a React dependency and forces every test to set up a Provider tree. The functions take primitive arguments; hooks add no value.
- *Putting them in `@ramcar/shared`* — rejected: `@ramcar/shared` carries Zod schemas and types shared with the API. These three functions are a frontend-only product policy. Mixing product policy with API DTOs would force the API to depend on UI rules.

---

## R2 — How does the selector know the role?

**Decision**: Use the existing `useRole()` adapter from `packages/features/src/adapters/role.tsx`. It already returns `Role` (`"SuperAdmin" | "Admin" | "Guard" | "Resident"`) and is already mounted by both host apps (`apps/web/src/shared/lib/features/role.tsx` and `apps/desktop/src/shared/lib/features/role.tsx`).

The shared `<TenantSelector />` already imports `useRole` for an unrelated use (showing an `inactive` badge for SuperAdmin only). We reuse it.

**Rationale**: FR-024 forbids implementing the rules by editing the API responses or by removing components. The role port is the existing, sanctioned, single source of truth for "what role is the current user?" in the shared feature modules. Same provider services every other role-aware UI in the app.

**Alternatives considered**:
- *Read role directly from `useAuthStore()`* — the current `AuthStorePort` does not expose role. Extending it would entail a host-app change and a port-shape change for what amounts to one read.
- *Read role from the auth-slice via `useAppStore((s) => s.user?.role)`* — `useAppStore` is host-app state, not part of the shared feature module's adapter contract. The shared module should consume role through its own adapter (Principle II / III).

---

## R3 — How does the Tenants-create gating know how many tenants the Admin already has?

**Decision**: The gating uses the `useTenants` hook already mounted by `TenantsTable` to render the table. When `handleCreate` runs, it reads `data?.data.length` (the count of tenants visible to the current user from `GET /api/tenants`) and passes it to `canCreateAnotherTenant(role, count)`.

For an Admin, that endpoint already returns only their assigned tenants (per spec 020 RLS / scope) — so `data.length === 0` means "no assigned tenants" and `>= 1` means "has at least one." No new query, no new endpoint.

For SuperAdmin, the same call returns every tenant — but `canCreateAnotherTenant("SuperAdmin", n)` ignores `n` and always returns `true`, so the count is irrelevant to the branch.

**Rationale**: FR-022 forbids new endpoints. Reuse-not-build wins. The list-by-actor scoping is already in place from spec 020.

**Alternatives considered**:
- *Read `tenantIds.length` from the auth slice* — works for Admin's "first session" case, but breaks the Story 2 acceptance criterion #2: "the Admin has just created their first tenant; the next click on Create Tenant in the same session opens the ContactSupportDialog." The auth slice's `tenantIds` is hydrated from the JWT and the JWT only refreshes on sign-in or token refresh. The just-created tenant is in the API response (the new tenant is auto-assigned to the creating Admin per spec 020) but might not yet be in the JWT until refresh. We need the API count, not the JWT count, to satisfy FR-012.
- *Use a dedicated `GET /api/tenants/count` endpoint* — rejected (FR-022): no new endpoints. The list endpoint with `page_size=1` is already cheap.

**Refresh edge**: After `useCreateTenant` succeeds, `useTenants` is invalidated (existing behavior in `useCreateTenant`'s `onSuccess`). The next click on the create button re-runs the gating against the refreshed list — FR-012 satisfied. We add a unit test asserting this loop.

---

## R4 — How does the user form know the creator is an Admin and what their current tenant is?

**Decision**: The user form already reads `useAppStore((s) => s.user)` and computes `actorRole`. We extend the existing `actorRole === "admin"` check to drive the locked single-select. The locked tenant ID comes from `useAppStore((s) => s.activeTenantId)` — already in the slice from spec 021. Falls back to `currentUser?.tenantId` if the active id is missing (defensive, matches the existing `formData.tenantId` initializer at user-form.tsx:94).

For consistency, the form also re-uses the existing `tenants` prop (already loaded by `UserSidebar`) — for Admin the prop is filtered server-side to the Admin's assigned tenants by the existing `useTenants({ status: "active" })` call (spec 020 scope). The `<Select>` then shows that one tenant by id, and `disabled` prevents change.

**Rationale**: We keep the form's existing data flow (tenants list loaded once at the sidebar; form receives them as a prop). We do not introduce a new data path. The lock is a `disabled` attribute on the existing `<Select>` — semantic, accessible, and a future tier feature can flip it back by removing the `disabled` line.

**Alternatives considered**:
- *Hide the field entirely for Admin creators* — rejected by FR-016: "the tenant field MUST be visible … so the form remains explicit about what tenant the new user will be assigned to." Visibility is a requirement, not an option.
- *Render the field as plain text instead of a disabled select* — rejected: `<Select disabled value=…>` already shows the label and is the simplest accessible read-only state for a select. Same approach used elsewhere in the form (`Select` with `disabled` for self-edit role lock; user-form.tsx:303).

---

## R5 — Single-select for resident vs. single-select for admin/guard: same widget?

**Decision**: Yes, same `<Select>` widget for all three role values in the v1 form. The previous form had two branches:
- residents → single-select `<Select>` over the tenants list
- admin/guard → multi-select `<TenantMultiSelect>` (chips + popover)

The v1 form collapses both branches into one `<Select>`. The submit step then chooses the payload shape:
- **role === "resident"** → `tenant_id: <selected>` (resident endpoint already takes a singular `tenant_id` per spec 020)
- **role === "admin" | "guard"** → `tenant_ids: [<selected>]`, `primary_tenant_id: <selected>` (multi-tenant endpoint, with an array of length 1)
- **role === "super_admin"** → no tenant in payload (super_admin's `tenant_ids = "*"` is server-derived; the form already skips the field for that role at user-form.tsx:348)

**Rationale**: FR-014 says "single-select control for every role" and FR-022 says the API DTO must not change. Mapping the single-select value onto either `tenant_id` (resident) or `[tenant_ids]+primary_tenant_id` (admin/guard) at submit is a 5-line block at the existing `handleSubmit`'s payload-building step. No DTO change, no validator change.

**Alternatives considered**:
- *Change the API to accept a singular `tenant_id` for admin/guard too* — rejected (FR-022). The API stays multi-tenant-shaped; v1 just fills the array with one element.
- *Keep TenantMultiSelect with `maxItems=1`* — rejected: same UX as a single-select but with extra DOM (chips, primary radio, X button) that no longer makes sense when N is always 1. The chip + primary-tenant indicator from spec 020 is exactly what FR-014 says to remove. Deleting the component is the cleanest expression of the policy.

---

## R6 — What does the deterministic "current tenant" tiebreak look like for Admin/Guard with `tenant_ids.length > 1`?

**Decision**: Add a small reconciliation step inside the existing `useEffect` at `tenant-selector.tsx:39-45` that already syncs `activeTenantName` from the fetched tenant list. The widened logic:

1. If the user's role is SuperAdmin, take no action (existing behavior — switching is allowed).
2. Otherwise (Admin/Guard/Resident), once the `tenants` list is fetched:
   - If `activeTenantId` is present in `tenants`, accept it.
   - If not, sort `tenants` by `name` (locale-aware) ascending and pick the first one. Call `setActiveTenant(first.id, first.name)`.

Because the selector is **already** the rendered consumer of the tenant list and **already** runs this useEffect on tenant-list resolution, we add the tiebreak there instead of creating a new bootstrap path.

**Rationale**:
- FR-003 mandates "preference: `profiles.tenant_id` if present in `tenant_ids`; otherwise the first element of `tenant_ids` sorted by tenant name." The existing `hydrateActiveTenant(fallbackPrimary)` in `auth-slice.ts:65-96` already covers the first half (it falls back to `fallbackPrimary` then to `tenantIds[0]`). The second half — sorting by name when the primary is missing/invalid — needs the tenant list, which is only known after the API returns.
- The selector component is mounted on every authenticated page on both apps (it's in the top bar). It's the natural place to converge to the deterministic value.
- Edge case is rare per spec ("expected to be cleaned up out-of-band"); we deliberately do not add a fancy bootstrap fetch.

**Alternatives considered**:
- *Compute the tiebreak in the auth-slice's `hydrateActiveTenant`* — rejected: the slice cannot fetch the tenant list (it would violate Principle VIII via direct Supabase calls or pull a transport into the store). The selector already has the tenant list.
- *Compute the tiebreak server-side when minting the JWT* — rejected (FR-022 / no API change). Plus, the JWT already carries `tenant_ids` and `profiles.tenant_id`; the deterministic tiebreak is a UI choice over those values, not a backend decision.
- *Random pick* — rejected by FR-003 ("deterministically").

---

## R7 — Contact-support Dialog content: what does it say, and where do we keep the contact channel?

**Decision**: Four i18n keys in `@ramcar/i18n/src/messages/{en,es}.json`:

```jsonc
{
  "tenants": {
    "contactSupport": {
      "title": "Contact support to add another community",
      "body": "Your account is set up to manage one community. Reach out to support and we'll help you add another.",
      "close": "OK",
      "supportInstruction": "Email info@ramcarsoft.com or open a request from the Help menu."
    }
  },
  "users": {
    "form": {
      "tenantLockedHint": "New users are added to your community. Contact support if you need to assign a different one."
    }
  }
}
```

The Spanish translations mirror the structure with the same keys.

The `supportInstruction` key holds the actual contact channel (email today, possibly an in-app form later) so the channel can change without a code release — the team just edits the catalog. The Dialog body shows `body` followed by `supportInstruction`.

**Rationale**:
- FR-010: "translated, plain-language statement that tells them their account does not allow creating additional communities and instructs them how to reach support."
- FR-023: "added to `@ramcar/i18n` and consumed by both `apps/web` and `apps/desktop` through the existing i18n adapters."
- The "contact channel" (email vs. ticketing) is volatile; isolating it in `supportInstruction` lets ops edit it without engineering involvement (Spec Assumptions: "the specific contact channel … is decided by the implementing team and stored in `@ramcar/i18n`").

**Alternatives considered**:
- *Hard-code the support email in the component* — rejected: violates FR-023; means a code release whenever the channel changes.
- *Fetch the support channel from a remote config endpoint* — rejected: out of scope, adds a network dependency for static copy.

---

## R8 — Should `TenantMultiSelect` be deprecated or deleted?

**Decision**: **Delete** `apps/web/src/features/users/components/tenant-multi-select.tsx` and its tests. Remove its imports from `user-form.tsx`. Remove the four i18n keys it owned (`users.form.tenantsMultiLabel`, `tenantPrimaryLabel`, `tenantSetPrimary`, `tenantRemove`, `tenantsSearchPlaceholder`, `tenantsEmpty`) — except keep `tenantsSearchPlaceholder` if it's used by another control. (Quick grep before deletion.)

**Rationale**:
- CLAUDE.md "Tone and style" / "Coding conventions": "Avoid backwards-compatibility hacks like renaming unused _vars, re-exporting types, adding `// removed` comments for removed code, etc. If you are certain that something is unused, you can delete it completely."
- The future tier/permission feature will not bring back this *exact* component — it will replace the policy bodies (R1) so the v1 single-select stays and either expands to multi-select via a new component or unlocks the existing one. Keeping a dead chip-based multi-select around as "deprecated" pollutes the codebase.
- The deletion is git-recoverable; spec 020's PR is the canonical reference if the team wants to revive the chip-multi-select UI later.

**Alternatives considered**:
- *Keep `TenantMultiSelect` and gate it behind a `role === "SuperAdmin"` flag* — rejected: SuperAdmin in v1 also uses single-select per FR-014 ("single-select control for every role"). The chip-multi-select has no v1 caller.
- *Move it to `packages/features/` for a future feature* — rejected: speculative reuse. If a future spec reintroduces multi-tenant assignment with a different UX, it can author a new component then.

---

## R9 — Does the selector need to do anything for Resident role?

**Decision**: No code change for Resident. The current shared `<TenantSelector />` already shows the static span when `tenantIds.length <= 1` (the resident case), and Residents are not affected by Stories 1–3 of this spec. After R1's change, Residents also fall into the `role !== "SuperAdmin"` path (static span), which is functionally identical to what they get today.

**Rationale**: spec Edge Cases section: "Residents already do not have a tenant selector and already see only their own records; this spec does not change anything for them." Verified by code reading.

---

## R10 — Test data for E2E

**Decision**: Add three Playwright fixtures (or extend existing seed users):
- `admin_with_zero_tenants@test.com` — Admin role, `tenant_ids = []`. Used to verify Story 2 (first-tenant Sheet path) and Story 1 empty-state.
- `admin_with_one_tenant@test.com` — Admin role, `tenant_ids = [t1]`. Used to verify ContactSupportDialog gating, no selector render, scoped lists.
- `superadmin@test.com` — already exists. Used to verify Story 4 control (selector renders, Sheet always opens, freely changeable user-form tenant select).

The seed lives in `supabase/seed.sql` alongside the existing seed users; Playwright signs in by email/password.

**Rationale**: Reuses the existing seed pattern. Three roles × two tenant-count states for Admin = six test cases that map 1:1 to the Functional Requirements.

**Alternatives considered**:
- *Mock the JWT directly in tests* — rejected: spec-021's selector changes rely on real JWT claims and `user_tenants` rows. Real seed mirrors production shape.

---

## Open questions

None. All design questions resolved above. The plan is ready for Phase 1.
