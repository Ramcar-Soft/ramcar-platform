# Phase 1 — Data Model: Users Form Sidebar Migration

**Feature**: `015-users-form-sidebar`
**Date**: 2026-04-21

This feature introduces **no new persisted entities** and **no schema changes**. This document inventories the existing entities consumed by the Sheet and defines the new internal UI contract for `UserSidebar`.

---

## 1. Persisted entities (no change)

All entities already exist in the database (from specs `008-catalog-users` and `009-refactor-users-api-first`) and in `@ramcar/shared`. Listed here for completeness.

### 1.1 `ExtendedUserProfile` (read + list)

The row shape returned by `GET /api/users` and `GET /api/users/:id`. Rendered by `UsersTable` and consumed by `UserForm.initialData`.

| Field            | Type                             | Nullable | Notes                                              |
|------------------|----------------------------------|----------|----------------------------------------------------|
| `id`             | `string` (UUID)                  | no       | Profile ID (primary key)                           |
| `userId`         | `string` (UUID)                  | no       | Supabase auth user ID                              |
| `tenantId`       | `string` (UUID)                  | no       | Always present — scoped by `TenantGuard`           |
| `tenantName`     | `string`                         | no       | Denormalized for table display                     |
| `fullName`       | `string`                         | no       |                                                    |
| `email`          | `string`                         | no       |                                                    |
| `role`           | `"super_admin" \| "admin" \| "guard" \| "resident"` | no | Constitution VI hierarchy          |
| `address`        | `string`                         | no       |                                                    |
| `username`       | `string`                         | no       | ≥ 3 chars, letters/numbers/underscores             |
| `phone`          | `string`                         | no       |                                                    |
| `phoneType`      | `"house" \| "cellphone" \| "work" \| "primary" \| null` | yes |                                             |
| `status`         | `"active" \| "inactive"`         | no       |                                                    |
| `userGroupIds`   | `string[]`                       | no       | Join-table derived                                 |
| `userGroups`     | `UserGroup[]`                    | no       | Denormalized for display                           |
| `observations`   | `string \| null`                 | yes      |                                                    |
| `createdAt`      | `string` (ISO)                   | no       |                                                    |
| `updatedAt`      | `string` (ISO)                   | no       |                                                    |
| `canEdit`        | `boolean`                        | no       | API-computed per caller's role vs. target's role   |
| `canDeactivate`  | `boolean`                        | no       | API-computed per caller's role vs. target's role   |

### 1.2 `CreateUserInput` (Zod-inferred)

Payload for `POST /api/users`. Unchanged from spec 009. Validated by the NestJS `ZodValidationPipe` using the schema in `packages/shared/src/validators/user.ts` and by the frontend `UserForm` using the same schema (Constitution V).

Fields (summary): `fullName`, `email`, `role`, `tenantId`, `address`, `username`, `phone`, `phoneType?`, `userGroupIds`, `observations?`, `password?` (optional — when omitted the API triggers a password-reset email flow per the existing behavior).

### 1.3 `UpdateUserInput` (Zod-inferred)

Payload for `PUT /api/users/:id`. Unchanged from spec 009. Same fields as `CreateUserInput` except `password` / `confirmPassword` are not accepted (edit mode does not handle password changes — a separate flow does).

### 1.4 Supporting types (unchanged)

- `UserGroup` — `{ id, name, tenantId, ... }`
- `PhoneType` — literal union, see 1.1
- `Role` — literal union, see 1.1
- `UserFilters` — table query-params type (`page`, `pageSize`, `sortBy`, `sortOrder`, `tenantId?`, `status?`, `search?`)
- `PaginatedResponse<T>` / `PaginationMeta` — envelope types from `@ramcar/shared`

No field changes, no new relationships, no state transitions introduced by this feature.

---

## 2. New internal UI contract: `UserSidebar`

The only new "entity" added by this feature is a React component contract. It is internal to `apps/web/src/features/users/components/` and not exported outside the feature.

### 2.1 Component location

`apps/web/src/features/users/components/user-sidebar.tsx`

### 2.2 Props

```ts
export type UserSidebarMode = "create" | "edit";

export interface UserSidebarProps {
  /** Whether the Sheet is open. Parent (UsersTable) owns this state. */
  open: boolean;

  /** Which form variant to render. Only read when `open === true`. */
  mode: UserSidebarMode;

  /**
   * The user to edit, required iff `mode === "edit"`.
   * When `mode === "create"`, this must be `undefined`.
   */
  userId?: string;

  /**
   * Called when the Sheet should close — wired to the Sheet's
   * `onOpenChange={(next) => !next && onClose()}` and to the form's
   * onCancel/onSuccess.
   */
  onClose: () => void;
}
```

### 2.3 Invariants

- **I-1**: `mode === "create"` implies `userId === undefined`. The component may assert this in a dev-only `useEffect` but must not throw in prod.
- **I-2**: `mode === "edit"` implies `typeof userId === "string"` and `userId.length > 0`. Same assertion rule.
- **I-3**: `open === false` means no `useGetUser(id)` request is in flight. The component achieves this via `enabled: Boolean(open && mode === "edit" && userId)` on `useGetUser`.
- **I-4**: The component owns no persistent state — all form state lives inside `UserForm`, all data-fetching state lives inside TanStack Query hooks, Sheet open/close state is owned by the parent (`UsersTable`).

### 2.4 Internal state transitions

`UserSidebar` is a pure render-from-props component; its observable "state" is derived from props + hook outputs.

| Parent state                                     | Rendered body                                                |
|---------------------------------------------------|--------------------------------------------------------------|
| `open=false`                                     | Sheet closed (nothing rendered in the portal)                |
| `open=true, mode="create"`                       | `UserForm mode="create"` (no initialData)                    |
| `open=true, mode="edit", isLoading`              | Spinner                                                      |
| `open=true, mode="edit", isError`                | Error banner with `users.errorLoading`                       |
| `open=true, mode="edit", data present`           | `UserForm mode="edit" initialData={data}`                    |

### 2.5 Data-flow diagram

```
UsersTable
  state: sidebarOpen, sidebarMode, selectedUserId
  events: handleOpenCreate, handleOpenEdit(u), handleClose
    │
    │ props
    ▼
UserSidebar (new)
  hooks inside (only when relevant mode+open):
    useGetUser(userId)         ← edit mode only
    useTenants()               ← both modes (form dropdown source)
    useUserGroups()            ← both modes (form dropdown source)
    useCreateUser()            ← create mode only
    useUpdateUser(userId!)     ← edit mode only
    │
    │ form props + submit handler
    ▼
UserForm (unchanged public contract)
  ├── internal useState for form data
  ├── useFormPersistence("user-create" | "user-edit-<id>")
  └── onSubmit → parent's useCreateUser/useUpdateUser mutation
        │
        ▼
apiClient (HTTP)
        │
        ▼
NestJS API → TenantGuard → RolesGuard → UsersService → UsersRepository → Supabase
```

### 2.6 Out-of-scope behaviors (deliberately not added)

- **Unsaved-changes confirm dialog**: not added. Auto-save via `useFormPersistence` is the recovery mechanism (see R-004).
- **Optimistic mutations**: not added. Current `useCreateUser` / `useUpdateUser` invalidate `["users"]` on success; the list re-queries in < 1 s and the brief gap is acceptable for an internal app.
- **Sheet stacking**: only one `UserSidebar` instance per page. Switching from edit to create is a state replacement, not a stack push.

---

## 3. What is NOT changed by this feature

Listed explicitly because future readers will reasonably ask "did this feature touch X?" — the answer is no:

- **`@ramcar/shared/validators/user.ts`** — unchanged. Zod schemas for create/update/userFilters stay as-is.
- **`apps/api/src/modules/users/`** — unchanged. Controller routes, service, repository, guards all unchanged.
- **Database** — no migrations. The `profiles`, `user_groups`, and `profile_user_groups` tables (from 008) are untouched.
- **RLS policies** — unchanged.
- **Desktop (`apps/desktop`)** — unchanged. Users remains a web-only feature.
- **`packages/features`** — unchanged. Users is not promoted to a shared feature module.
- **`packages/store`** — unchanged. No new Zustand slices are needed; Sheet open/close state lives in `UsersTable`'s local `useState`, consistent with Visitors/Providers.
- **`packages/ui`** — unchanged. The existing `Sheet` primitives are used as-is.

---

## 4. Key-space audit (localStorage)

| Key                   | Owner            | Scope                     | Change |
|-----------------------|------------------|---------------------------|--------|
| `ramcar-draft:user-create` | `useFormPersistence` (via `UserForm`) | Create-mode draft | No change |
| `ramcar-draft:user-edit-<id>` | `useFormPersistence` (via `UserForm`) | Per-user edit draft | No change |

No new localStorage keys introduced; no existing keys renamed; no key-space collisions with other features (visitor keys are namespaced `visit-person-*`).
