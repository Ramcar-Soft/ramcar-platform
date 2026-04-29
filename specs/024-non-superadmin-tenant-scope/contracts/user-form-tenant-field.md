# UI Contract: User-Form Tenant Field

**Spec**: 024 | **Story**: User Story 3 | **Requirements**: FR-014, FR-015, FR-016, FR-017, FR-018, FR-019, FR-022, FR-023

This document is the contract for the tenant assignment field rendered inside the Users-catalog form (web only). It rolls back the multi-select-with-chips control from spec 020 user story 6 to a single-select for v1, with a role-aware `disabled` state for Admin creators.

---

## Component: `<UserForm />` (existing, modified)

**Location**: `apps/web/src/features/users/components/user-form.tsx`

### Removed

- Import: `import { TenantMultiSelect } from "./tenant-multi-select";`
- The branch at `user-form.tsx:332-347` that renders `<TenantMultiSelect>` for `formData.role === "admin" || formData.role === "guard"`.
- The radio/chip-based "primary tenant" selection mechanism.
- The form-state fields `tenantIds: string[]` and `primaryTenantId: string` are removed from the user-facing widget surface; the values are computed from a single `tenantId` at submit time.

### Kept

- The `<Select>` already used for `role === "resident"` at `user-form.tsx:354-368`. This becomes the single-select control for **all** roles that need a tenant value.
- The "no tenant for super_admin" branch at `user-form.tsx:348-351` (super_admin user being *created* — the wildcard `*` is server-derived; the form does not collect a tenant for a super_admin user).

### Added

- A computed flag `tenantFieldLocked = !canEditUserTenantField(actorRole)` (where `actorRole` is the **creator's** role, already read at `user-form.tsx:73-74`). When `true`:
  - The `<Select>` is rendered with `disabled` and the value pre-set to `currentUser.activeTenantId` (or `currentUser.tenantId` as a fallback).
  - A small hint paragraph below the select shows `t("users.form.tenantLockedHint")`.

---

## Decision table

| Role of user being created/edited | Creator role | Tenant field |
|-----------------------------------|--------------|--------------|
| `super_admin` | SuperAdmin | Not rendered (existing behavior; the `★` placeholder text remains). |
| `admin` | SuperAdmin | Single-select `<Select>`, all tenants. Free to change. |
| `admin` | Admin | Single-select `<Select>`, all tenants. Pre-filled with creator's `activeTenantId`. **`disabled`**. Hint shown. (Note: in practice, an Admin cannot create another Admin per the existing role hierarchy; `getAssignableRoles("admin")` returns `["guard", "resident"]`. This row exists for completeness in case future role-permissions enable it.) |
| `guard` | SuperAdmin | Single-select `<Select>`, all tenants. Free to change. |
| `guard` | Admin | Single-select `<Select>`, all tenants. Pre-filled with creator's `activeTenantId`. **`disabled`**. Hint shown. |
| `resident` | SuperAdmin | Single-select `<Select>`, all tenants. Free to change (existing behavior, unchanged). |
| `resident` | Admin | Single-select `<Select>`, all tenants. Pre-filled with creator's `activeTenantId`. **`disabled`**. Hint shown. |

The widget shape is the same `<Select>` in every "rendered" row; the only differences are the value source and `disabled`.

---

## Form state shape

**Removed from `UserFormData`** (the in-form state object):
- `tenantIds: string[]`
- `primaryTenantId: string`

**Kept**:
- `tenantId: string` — the single source of truth for the tenant value at every step.

The TypeScript interface in `user-form.tsx`:

```ts
export interface UserFormData {
  fullName: string;
  email: string;
  role: string;
  tenantId: string;          // <-- single field; replaces tenantIds + primaryTenantId
  address: string;
  username: string;
  phone: string;
  password?: string;
  confirmPassword?: string;
  phoneType?: PhoneType;
  userGroupIds: string[];
  observations?: string;
}
```

---

## Submit-time payload mapping

The API contract from spec 020 is **not changed** (FR-022). The form maps `tenantId` to the appropriate payload shape based on the role of the user being created/edited:

```ts
// inside handleSubmit, after validation
const role = formData.role;
const submitData: Record<string, unknown> = {
  ...formData,
  email: trimmedEmail,
  phone: normalizedPhone || undefined,
  username: trimmedUsername || undefined,
};

if (role === "admin" || role === "guard") {
  submitData.tenant_ids = [formData.tenantId];           // length-1 array
  submitData.primary_tenant_id = formData.tenantId;
  delete submitData.tenantId;
} else if (role === "resident") {
  // resident endpoint already takes singular tenant_id — keep formData.tenantId as-is
} else {
  // super_admin — no tenant in payload (server uses wildcard)
  delete submitData.tenantId;
}
```

The repository / NestJS endpoint signature remains unchanged. The server still validates `tenant_ids` against the actor's scope (spec 020 server checks); a tampered client that constructs an array of length > 1 is still rejected by the existing checks.

---

## Initial-data resolution (edit mode)

When the form opens in edit mode for a user with legacy multi-tenant data (`initialData.tenantIds.length > 1`), the form picks **one** tenant for the single-select (FR-019):

```ts
// inside the useState initializer
const initialTenantId =
  initialData?.tenantId
  ?? initialData?.tenantIds?.[0]
  ?? "";
```

When the user submits the form (whether they changed the value or not), the API receives `tenant_ids: [oneId] + primary_tenant_id: oneId` (for admin/guard) or `tenant_id: oneId` (for resident). Per FR-019, the server-side update reconciles the user's `user_tenants` rows to that single tenant. (The server behavior already exists in spec 020's update path; sending an array of length 1 produces a single `user_tenants` row.)

---

## Validation

The existing validation block at `user-form.tsx:171-210` is simplified:

```ts
if (role === "resident" || role === "admin" || role === "guard") {
  if (!formData.tenantId) {
    errs.tenantId = tError("users.validation.tenantRequired");
  }
}
```

The previous `users.validation.atLeastOneTenant` and `users.validation.primaryMustBeSelected` keys are no longer surfaced (the multi-select that produced them is gone).

`users.validation.tenantRequired` is the existing key from spec 020 (used by the resident branch). Reuse, don't add.

FR-017: "missing tenant fails validation with a translated message; an array of more than one tenant is not possible to construct from the new UI." The array-of-more-than-one path is not reachable from the v1 UI (the field is a single `<Select>`).

---

## i18n keys

**Added** (one new key):

```jsonc
{
  "users": {
    "form": {
      "tenantLockedHint": "..."
    }
  }
}
```

| Key | English | Spanish |
|-----|---------|---------|
| `users.form.tenantLockedHint` | `"New users are added to your community. Contact support if you need to assign a different one."` | `"Los nuevos usuarios se añaden a tu comunidad. Contacta a soporte si necesitas asignar otra."` |

**Removed** (no longer referenced):

- `users.form.tenantsMultiLabel`
- `users.form.tenantsSearchPlaceholder` (only if no other component uses it — verify with `grep` before deletion)
- `users.form.tenantsEmpty`
- `users.form.tenantPrimaryLabel`
- `users.form.tenantSetPrimary`
- `users.form.tenantRemove`
- `users.validation.atLeastOneTenant`
- `users.validation.primaryMustBeSelected`
- `users.validation.tooManyTenants`

The deletion is git-recoverable; if a future feature needs them, the spec-020 PR is the canonical reference.

---

## Test plan

| Layer | File | Cases |
|-------|------|-------|
| Unit | `packages/features/src/tenant-selector/policy/policy.test.ts` | `canEditUserTenantField` × 4 roles. |
| Component | `apps/web/src/features/users/__tests__/user-form-validation.test.tsx` | Update existing cases: payload for `admin`/`guard` shows `tenant_ids: [oneId]` + `primary_tenant_id: oneId`. Resident payload unchanged. Super-admin payload omits tenant. Missing tenant fails validation with `users.validation.tenantRequired`. |
| Component | `apps/web/src/features/users/__tests__/user-form-tenant-lock.test.tsx` (new) | Admin creator: `<Select>` is `disabled`, value is `currentUser.activeTenantId`, hint visible, submitting still ships the tenant in the payload. SuperAdmin creator: `<Select>` is enabled, value is editable. |
| Component | `apps/web/src/features/users/__tests__/user-sidebar.test.tsx` | Existing tests pass after the form change (fail closed: any sidebar test that asserts the chip-multi-select must be deleted or updated). |
| E2E (web) | `apps/web/e2e/user-form-tenant-field.spec.ts` | Sign in as Admin → open Users catalog → click New → tenant select is disabled and shows the Admin's tenant name → fill name + email + role=guard → submit → verify the new user is created with `profiles.tenant_id` equal to the Admin's tenant. Sign in as SuperAdmin → confirm the select is enabled and lists all tenants. |
| API regression (Jest) | `apps/api/test/e2e/users.e2e-spec.ts` | Re-run unchanged. Any failure indicates we accidentally edited the API. |

---

## Backwards compatibility

- The API DTO (`createUserSchema`, `updateUserSchema` in `@ramcar/shared`) is unchanged.
- The server-side reconciliation of `user_tenants` rows when a single tenant is sent is the spec-020 behavior; nothing changes there.
- Users created before this spec with multiple `user_tenants` rows continue to load; their first row (or `profiles.tenant_id`) is shown in the v1 single-select. On save, the extra rows are reconciled to one (FR-019).

## Out of scope

- A "switch primary tenant" UX. Removed entirely; v1 has only one tenant per user from the UI's perspective.
- Showing the user a list of tenants they were previously assigned to. Not displayed in v1.
- A separate "advanced" toggle to reveal the multi-select. Not in v1.
