# API Contract: Users (ratification, no changes)

**Feature**: `015-users-form-sidebar`
**Date**: 2026-04-21

This feature does not add, remove, or modify any API endpoints. This document exists to make it explicit which existing endpoints the Sheet will exercise and to freeze their contracts for the scope of this feature, so any drift is caught at PR review.

The source of truth for these endpoints remains `apps/api/src/modules/users/`. If any of the schemas below diverge from what the API actually returns at implementation time, the plan is wrong — not the API.

---

## `GET /api/users/:id`

Used by `UserSidebar` when `mode === "edit"` to pre-populate the form.

| Property           | Value                                                             |
|--------------------|-------------------------------------------------------------------|
| **Auth**           | Bearer JWT (via `JwtAuthGuard`)                                   |
| **Roles allowed**  | `super_admin`, `admin` (tenant-scoped). See `UsersController`.    |
| **Tenant scope**   | `TenantGuard` — profile must belong to caller's tenant, except `super_admin` which sees all tenants. |
| **Path params**    | `id` — profile UUID                                               |
| **Query params**   | —                                                                 |
| **Request body**   | —                                                                 |
| **Response 200**   | `ExtendedUserProfile` (shape defined in `@ramcar/shared`)         |
| **Response 401**   | Missing/invalid JWT                                                |
| **Response 403**   | Authenticated but role not permitted                               |
| **Response 404**   | Profile not found or belongs to a different tenant                 |

**Frontend consumer**: `useGetUser(id)` in `apps/web/src/features/users/hooks/use-get-user.ts` — **unchanged**.

---

## `POST /api/users`

Used by `UserSidebar` when `mode === "create"` and the form is submitted.

| Property           | Value                                                             |
|--------------------|-------------------------------------------------------------------|
| **Auth**           | Bearer JWT                                                        |
| **Roles allowed**  | `super_admin` (across tenants), `admin` (own tenant only)         |
| **Tenant scope**   | Non-`super_admin` callers are forced onto their own tenant (DTO `tenantId` is overridden by `@CurrentTenant()` if submitted differently). |
| **Path params**    | —                                                                 |
| **Query params**   | —                                                                 |
| **Request body**   | `CreateUserInput` (Zod-validated by NestJS `ZodValidationPipe` using the schema from `@ramcar/shared`)                |
| **Response 201**   | `ExtendedUserProfile` (newly created)                             |
| **Response 400**   | Zod validation failure — schema error map in body                 |
| **Response 401**   | Missing/invalid JWT                                                |
| **Response 403**   | Authenticated but role not permitted                               |
| **Response 409**   | Duplicate email or username                                        |

**Frontend consumer**: `useCreateUser()` in `apps/web/src/features/users/hooks/use-create-user.ts` — **unchanged**. On success, invalidates `["users"]` query.

**Notes**:
- If `password` is omitted, the API triggers a Supabase Auth invitation email (existing behavior from spec 008). The `UserForm` currently shows a hint (`users.form.passwordResetInfo`) when both password fields are empty. This behavior is preserved.

---

## `PUT /api/users/:id`

Used by `UserSidebar` when `mode === "edit"` and the form is submitted.

| Property           | Value                                                             |
|--------------------|-------------------------------------------------------------------|
| **Auth**           | Bearer JWT                                                        |
| **Roles allowed**  | `super_admin`, `admin`                                            |
| **Tenant scope**   | Target profile must be in caller's tenant unless caller is `super_admin` |
| **Self-edit rule** | An `admin` editing themselves may NOT change their own `role`. The DTO's `role` field is dropped server-side in that case; the frontend also disables the `Select` (see `UserForm`'s `roleLocked`). |
| **Path params**    | `id` — profile UUID                                               |
| **Query params**   | —                                                                 |
| **Request body**   | `UpdateUserInput` (Zod-validated)                                 |
| **Response 200**   | `{ success: boolean; user: ExtendedUserProfile }`                 |
| **Response 400**   | Zod validation failure                                            |
| **Response 401**   | Missing/invalid JWT                                                |
| **Response 403**   | Role not permitted OR attempted cross-tenant edit                 |
| **Response 404**   | Profile not found                                                  |
| **Response 409**   | Duplicate email or username                                        |

**Frontend consumer**: `useUpdateUser(id)` in `apps/web/src/features/users/hooks/use-update-user.ts` — **unchanged**. On success, invalidates `["users"]` query.

---

## Endpoints that are *still* used but not directly triggered by the Sheet

The following endpoints support the form's dropdowns and are already called by hooks the Sheet will reuse. Ratified here so their stability is visible at a glance.

- `GET /api/tenants` → `useTenants()` (populates the tenant `Select`; only renders the dropdown for `super_admin`).
- `GET /api/user-groups` → `useUserGroups()` (populates the user-group `Select`).
- `GET /api/users` → `useUsers(filters)` (populates the table; re-queried on `["users"]` invalidation after create/update/status-toggle).
- `POST /api/users/:id/status` (or equivalent) → `useToggleStatus()` (deactivate/reactivate dropdown action). **Not** wired into the Sheet; remains a separate confirm-dialog flow (`confirm-status-dialog.tsx`).

---

## Contract stability guarantee

If the implementation phase discovers that any response body diverges from what's written above (e.g., `ExtendedUserProfile` has gained a field, or `PUT /api/users/:id` now returns something other than `{ success, user }`), the correct action is:

1. Verify by reading `apps/api/src/modules/users/users.controller.ts` and the DTO.
2. Update the frontend hook's generic type in `use-get-user.ts` / `use-create-user.ts` / `use-update-user.ts` as needed.
3. Amend this contract document in the same PR so it matches reality.

**Do not** change the API to match a stale frontend type — the API is the source of truth.
