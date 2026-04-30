# API Contract: `/api/vehicles` (delta for FR-012)

**Branch**: `026-inline-vehicle-edit` | **Date**: 2026-04-29
**File**: `apps/api/src/modules/vehicles/vehicles.service.ts`

This contract documents the single API behavior change introduced by this feature. The endpoints, paths, request DTOs, and response shapes are otherwise unchanged.

## Endpoints (unchanged paths)

| Operation | Method + Path | DTO | Auth |
|-----------|---------------|-----|------|
| List by resident | `GET /api/vehicles?userId=…` | n/a | JWT + Tenant + Role (super_admin/admin/guard) |
| List by visit-person | `GET /api/vehicles?visitPersonId=…` | n/a | JWT + Tenant + Role (super_admin/admin/guard) |
| Update | `PATCH /api/vehicles/:id` | `updateVehicleSchema` | JWT + Tenant + Role (super_admin/admin/guard) |
| Soft-delete | `DELETE /api/vehicles/:id` | n/a | JWT + Tenant + Role (super_admin/admin/guard) |
| Create | `POST /api/vehicles` | `createVehicleSchema` | JWT + Tenant + Role (super_admin/admin/guard) |

Controller-level role guard (`@Roles("super_admin", "admin", "guard")`) is unchanged. The fine-grained role rule is in the service layer.

## Behavior change — `DELETE /api/vehicles/:id`

### Before (current behavior)

`VehiclesService.remove` (`vehicles.service.ts:62-75`) — guard role rejection runs only when the vehicle is owned by a resident:

```ts
async remove(id, scope, role) {
  const existing = await this.repository.findById(id, scope);
  if (!existing) throw new NotFoundException();
  if ((existing as { user_id: string | null }).user_id !== null && role === "guard") {
    throw new ForbiddenException("Guards cannot manage resident vehicles");
  }
  // ... proceed to softDelete
}
```

### After (FR-012)

The check tightens to "any guard delete is forbidden":

```ts
async remove(id, scope, role) {
  const existing = await this.repository.findById(id, scope);
  if (!existing) throw new NotFoundException();
  if (role === "guard") {
    throw new ForbiddenException("Guards cannot delete vehicles");
  }
  // ... proceed to softDelete
}
```

The exception class (`ForbiddenException`) and the HTTP status (403) are unchanged. The exception message is updated to reflect the broader rule.

### Response matrix (delta highlighted)

| Actor role | Owner | Before | After |
|------------|-------|--------|-------|
| `super_admin` | resident | 204 | 204 |
| `super_admin` | visit-person | 204 | 204 |
| `admin` | resident | 204 | 204 |
| `admin` | visit-person | 204 | 204 |
| `guard` | resident | 403 | 403 |
| `guard` | visit-person | **204** ← was permitted | **403** ← now forbidden |

## No change — `PATCH /api/vehicles/:id`

`VehiclesService.update` keeps the existing rule (FR-013): guards may update visit-person-owned vehicles, may not update resident-owned ones.

| Actor role | Owner | Behavior (unchanged) |
|------------|-------|----------------------|
| `super_admin` | any | 200 |
| `admin` | any | 200 |
| `guard` | resident | 403 |
| `guard` | visit-person | 200 |

## No change — `POST /api/vehicles`

The existing rule (from spec 025) is preserved: guards may create visit-person-owned vehicles, may not create resident-owned ones.

| Actor role | Owner | Behavior (unchanged) |
|------------|-------|----------------------|
| `super_admin` | any | 201 |
| `admin` | any | 201 |
| `guard` | resident | 403 |
| `guard` | visit-person | 201 |

## No change — `GET /api/vehicles`

Both list operations continue to honor `RolesGuard` and `TenantGuard`. All four roles in the role matrix are permitted to read; tenant scope is enforced by `@CurrentTenant()`.

## Test plan (Jest, `apps/api/src/modules/vehicles/__tests__/vehicles.service.spec.ts`)

Existing tests in the `VehiclesService.remove` block (preserve all):
- "throws NotFoundException when the vehicle is missing" — unchanged.
- "forbids guards deleting resident vehicles" — unchanged.
- "admin delete soft-deletes via the repository" — unchanged.
- "treats softDelete count of 0 as NotFound (concurrent delete)" — unchanged.

New tests to add:
- **NEW** "forbids guards deleting visit-person-owned vehicles": construct `findById` to return a row with `user_id: null, visit_person_id: "vp-1"`. Calling `service.remove("vehicle-1", adminScope, "guard")` rejects with `ForbiddenException`; `repository.softDelete` is not called. (This is the symmetric of the existing "forbids guards deleting resident vehicles" test, exercising the FR-012 widening.)
- **NEW** "admin can delete a visit-person-owned vehicle" (regression coverage): construct `findById` to return a row with `visit_person_id: "vp-1"`; `softDelete` returns 1; `service.remove` resolves; `softDelete` called with the vehicle id and tenant. Confirms the rule narrows only for guards.

Existing tests in `VehiclesService.update` are untouched (FR-013).

## Out-of-scope

- No change to soft-delete semantics. `deleted_at` is set; the row stays in the table.
- No change to historical access-event records that referenced the deleted vehicle. They continue to surface the historical label as today.
- No change to error codes, HTTP statuses, or DTO shapes.
- No new endpoint, no new DTO field.
