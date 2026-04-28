# Guard Role — Resident Vehicle Permissions

**Date:** 2026-04-28
**Author:** Ivan Eusebio (with Claude)
**Status:** Spec — pending implementation

## Summary

Restrict create / edit / delete of vehicles owned by **residents** to `admin` and `super_admin` roles. Guards continue to manage vehicles owned by `visitPerson` (visitors and providers) — the booth's gate-entry workflow is unchanged. Adds the missing `PATCH /vehicles/:id` and `DELETE /vehicles/:id` endpoints, soft-delete column, an edit mode in the shared `VehicleForm`, and a new "Manage vehicles" sub-view in the residents access-event sidebar.

## Goals

1. Backend rejects guard attempts to create / update / delete resident-owned vehicles with `403 Forbidden`.
2. Backend continues to accept guard create / update / delete on visitor / provider vehicles.
3. Admin and super_admin can edit and delete resident vehicles end-to-end (UI + API).
4. Vehicle delete is soft (`deleted_at`) so existing `access_events` referencing the vehicle keep their audit trail.
5. Guards see no manage-vehicle affordances when viewing a resident — entry points are hidden, not disabled.

## Non-goals

- Migrating the residents flow into the shared `@ramcar/features` package. (Tracked separately as the post-pilot residents migration.)
- Audit-log entries for vehicle edit / delete beyond `updated_at` and `deleted_at`.
- Changes to RLS policies on `vehicles` (existing tenant scoping is sufficient).
- Desktop offline / outbox support for `vehicle.update` and `vehicle.delete`. Admin actions on the booth desktop are rare; PATCH / DELETE go through the transport directly and fail with a toast if offline. Flagged as a follow-up if real demand emerges.
- Bulk operations.
- Restoring soft-deleted vehicles (no UI, no endpoint).

## Background

Vehicles are tenant-scoped and owned by either:

- **A resident** — `vehicles.user_id` set, `visit_person_id` null. Created from the residents access-event sidebar.
- **A visit person (visitor or provider)** — `visit_person_id` set, `user_id` null. Created from the visitors / providers sidebar at the guard booth.

Today, `VehiclesController` allows `super_admin / admin / guard` on `POST /vehicles` and `GET /vehicles`. There are no `PATCH` or `DELETE` endpoints. The shared `VehicleForm` (`packages/features/src/shared/vehicle-form/`) only supports create. Guards can therefore create resident vehicles directly from the residents flow, which is undesirable: residents are administered by office staff, not by gate guards.

## Architecture

### API (`apps/api/src/modules/vehicles/`)

#### New endpoints

```
PATCH /vehicles/:id
  Body: UpdateVehicleDto (Zod)
  Guards: JwtAuthGuard, TenantGuard, RolesGuard with @Roles("super_admin","admin","guard")
  Returns: Vehicle

DELETE /vehicles/:id
  Guards: JwtAuthGuard, TenantGuard, RolesGuard with @Roles("super_admin","admin","guard")
  Returns: 204 No Content
```

Controller-level `@Roles` stays permissive (all three roles). Owner-aware enforcement happens in the service. This matches the chosen approach (service-level conditional check) — keeps the rule colocated with the business logic that already needs the owner lookup.

#### `UpdateVehicleDto` (Zod, `dto/update-vehicle.dto.ts`)

All vehicle fields optional: `vehicleType?`, `brand?`, `model?`, `plate?`, `color?`, `notes?`, `year?`. Owner identity is immutable post-creation: `ownerType`, `userId`, `visitPersonId` are not allowed and trigger a Zod parse error if supplied.

#### `@CurrentUserRole()` decorator

New decorator under `apps/api/src/common/decorators/current-user-role.decorator.ts`. Reads `request.authUser?.app_metadata?.role` (the same source `RolesGuard` already uses). Injected into controller methods that delegate to the service.

#### Service-level role check

```ts
// VehiclesService.create
if (dto.ownerType === "user" && role === "guard") {
  throw new ForbiddenException("Guards cannot manage resident vehicles");
}

// VehiclesService.update
const existing = await this.repository.findById(id, scope);
if (!existing) throw new NotFoundException();
if (existing.user_id !== null && role === "guard") {
  throw new ForbiddenException("Guards cannot manage resident vehicles");
}

// VehiclesService.delete — same shape as update
```

The `findById` lookup for update / delete is needed anyway (existence + tenant scoping). The role branch is one line per method.

### Database

#### Migration `<timestamp>_vehicles_soft_delete.sql`

```sql
ALTER TABLE public.vehicles
  ADD COLUMN deleted_at TIMESTAMPTZ NULL;

CREATE INDEX vehicles_deleted_at_idx
  ON public.vehicles (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;
```

- New column nullable; defaults to `NULL` ("not deleted"). No backfill.
- Partial index supports the common active-vehicles query path.
- RLS policies unchanged.
- `pnpm db:types` regenerates `@ramcar/db-types` so `vehicles.deleted_at` is typed throughout the monorepo.

#### Repository changes (`vehicles.repository.ts`)

- `findByUserId`, `findByVisitPersonId` add `WHERE deleted_at IS NULL`.
- New `findById(id, scope)` — also filters `deleted_at IS NULL`. A soft-deleted row is treated as not found from the API's perspective.
- New `update(id, partialDto, tenantId)`.
- New `softDelete(id, tenantId)` — `UPDATE vehicles SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`.
- `softDelete` returns the row count so the service can distinguish "already deleted" from "not found".

### Shared package (`packages/features/src/shared/vehicle-form/`)

#### `VehicleForm` — extended

New props:

```ts
mode?: "create" | "edit";   // default "create"
vehicle?: Vehicle;          // required when mode === "edit"
```

Behavior in edit mode:

- Mutation calls `transport.patch<Vehicle>(\`/vehicles/${vehicle.id}\`, data)`.
- Initial state seeds from `vehicle` (not `initialDraft`).
- Heading text: `t("vehicles.editTitle")`.
- Submit button label: `t("vehicles.form.update")`.
- Cache invalidation key matches the existing pattern: `["vehicles", tenantId, "resident", userId]` for resident-owned, `["vehicles", tenantId, "visit-person", visitPersonId]` for visit-person-owned.

#### `VehicleManageList` — new component

`packages/features/src/shared/vehicle-form/vehicle-manage-list.tsx`

This spec uses the component only for residents (the `+ Manage vehicles` entry-point is gated to admin / super_admin in the residents access-event sidebar). The component is built around a generic `residentId` (resident's user id) for now; a `visitPersonId` overload can be added later if visit-person manage is needed.

```ts
interface VehicleManageListProps {
  residentId: string;
  onEdit: (vehicle: Vehicle) => void;
  onClose: () => void;
}
```

- Heading + back button (parent handles back via `onClose`).
- Vehicle list sourced from existing `useResidentVehicles(residentId)` hook.
- Each row renders the `formatVehicleLabel(v)` text, color swatch (via `resolveSwatch`), Edit icon button, Delete icon button.
- Delete opens an `AlertDialog` (`@ramcar/ui`) with title `t("vehicles.deleteConfirm.title")` and description showing the vehicle label. Confirm fires `transport.delete(\`/vehicles/${id}\`)`, invalidates the cache key, and toasts `t("vehicles.messages.deleted")` on success or `t("vehicles.messages.errorDeleting")` on failure.
- Empty state: `t("vehicles.manage.empty")`.

#### `useRole()` adapter — extended

Today the adapter returns `{ tenantId }`. Extend the adapter port to:

```ts
interface UseRoleResult {
  tenantId: string | null;
  role: Role;  // "super_admin" | "admin" | "guard" | "resident"
}
```

Both web and desktop adapter implementations (`apps/web/src/shared/lib/features/use-role.ts`, `apps/desktop/src/shared/lib/features/use-role.ts` — or wherever the existing implementations live) source `role` from the same `@ramcar/store` authSlice the rest of the app uses (`user.role`).

Existing call sites that destructure only `tenantId` continue to work — no breaking change.

### Per-app residents access-event sidebar

The residents flow is **not yet migrated** to the shared package. Both `apps/web/src/features/residents/components/access-event-sidebar.tsx` and `apps/desktop/src/features/residents/components/access-event-sidebar.tsx` are updated in parallel.

State machine (replaces today's `showVehicleForm: boolean`):

```ts
type SidebarView = "default" | "create" | "manage" | "edit";

const [view, setView] = useState<SidebarView>("default");
const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
```

Render branches:

```
view === "create"  → <VehicleForm userId={resident.id} mode="create" onSaved={...} onCancel={() => setView("default")} />
view === "manage"  → <VehicleManageList residentId={resident.id} onEdit={(v) => { setEditingVehicle(v); setView("edit"); }} onClose={() => setView("default")} />
view === "edit"    → <VehicleForm userId={resident.id} mode="edit" vehicle={editingVehicle!} onSaved={() => setView("manage")} onCancel={() => setView("manage")} />
default            → <AccessEventForm ... canManageVehicles={…} onAddVehicle={…} onManageVehicles={…} />
```

### `AccessEventForm` — role-gated entry points

New optional props:

```ts
canManageVehicles?: boolean;   // default false
onManageVehicles?: () => void;
```

The sidebar parent computes `canManageVehicles = role === "admin" || role === "super_admin"` from the extended `useRole()` adapter. The existing `+ Add vehicle` link and the new `+ Manage vehicles` link are rendered only when `canManageVehicles === true`. For guards, both are absent — the dropdown picker remains usable for selecting an existing vehicle on an access event.

The provider / visitor sidebars are untouched; guards keep full create / edit / delete access there.

### i18n strings (`@ramcar/i18n` `vehicles` and `accessEvents` namespaces)

```
vehicles.editTitle
vehicles.form.update
vehicles.manageTitle
vehicles.manage.empty
vehicles.manage.editAction
vehicles.manage.deleteAction
vehicles.deleteConfirm.title
vehicles.deleteConfirm.description     // interpolates {label}
vehicles.deleteConfirm.confirm
vehicles.deleteConfirm.cancel
vehicles.messages.updated
vehicles.messages.errorUpdating
vehicles.messages.deleted
vehicles.messages.errorDeleting
vehicles.messages.forbidden
accessEvents.vehicleSelect.manageVehicles
```

The existing `accessEvents.vehicleSelect.addVehicle` is reused.

## Data flow — admin opens resident's sidebar

```
1. AccessEventSidebar mounts for a resident (admin role).
2. useRole() → { tenantId, role: "admin" }.
3. canManageVehicles = true.
4. AccessEventForm renders the picker + "+ Add vehicle" + "+ Manage vehicles" links.
5. Admin clicks "+ Manage vehicles".
6. Sidebar swaps to <VehicleManageList residentId={resident.id} ...>.
7. List rendered from useResidentVehicles(resident.id) (already exists — no change).
8. Admin clicks Edit on a row.
9. Sidebar swaps to <VehicleForm mode="edit" vehicle={…} userId={resident.id} ...>.
10. Form submit → transport.patch(`/vehicles/${id}`, data).
11. API: VehiclesController.update → service checks ownerType (resident) + role (admin) → allowed → repository.update.
12. Cache invalidation on ["vehicles", tenantId, "resident", residentId].
13. onSaved → setView("manage") → list re-renders with updated vehicle.
```

## Data flow — guard opens resident's sidebar

```
1. AccessEventSidebar mounts for a resident (guard role).
2. useRole() → { tenantId, role: "guard" }.
3. canManageVehicles = false.
4. AccessEventForm renders the picker only — no create / manage links.
5. Guard selects an existing vehicle (or pedestrian mode) and submits the access event normally.
```

## Error handling

- API `ForbiddenException` (status 403, `{ message: "Guards cannot manage resident vehicles" }`). Frontend transport already maps non-2xx to thrown errors; mutation `onError` toasts `t("vehicles.messages.forbidden")`.
- `NotFoundException` (status 404) for update / delete on a missing vehicle, soft-deleted vehicle, or vehicle outside the requesting tenant.
- Zod parse error on update DTO → 400; frontend toasts a generic update error.
- Delete with stale UI (vehicle already soft-deleted by another admin in a different session): API returns 404 → toast + cache invalidation refreshes the list.
- Frontend role gating is **defense-in-depth only** — the API is the source of truth. A guard who bypasses the UI (devtools, direct API call) still gets 403.

## Testing

### API (`apps/api/src/modules/vehicles/__tests__/`)

`vehicles.service.spec.ts`:

- `create` — guard creating resident vehicle → throws `ForbiddenException`.
- `create` — guard creating visit-person vehicle → succeeds.
- `create` — admin / super_admin creating resident vehicle → succeeds.
- `update` — guard updating resident-owned vehicle → throws.
- `update` — guard updating visit-person-owned vehicle → succeeds.
- `update` — admin updating resident vehicle → succeeds, repository called with the right partial.
- `update` — DTO containing `ownerType` / `userId` / `visitPersonId` → Zod parse error.
- `update` / `delete` — vehicle not found → `NotFoundException`.
- `delete` — guard deleting resident vehicle → throws.
- `delete` — admin deleting → soft-delete sets `deleted_at`; subsequent `findByUserId` no longer returns the row.
- `findById` returning a soft-deleted row → `null` (so service throws `NotFoundException`).

`vehicles.controller.spec.ts`:

- PATCH and DELETE wired to the service with `@CurrentUserRole()` injecting role from `request.authUser.app_metadata.role`.
- `RolesGuard` continues to allow all three roles at the controller layer (the conditional check is the service's responsibility).

### Shared package (`packages/features/src/shared/vehicle-form/__tests__/`)

- `vehicle-form.test.tsx` (extend existing) — new edit-mode test: `mode="edit"` + `vehicle={…}`, submit invokes `transport.patch` with the correct path and body shape.
- `vehicle-manage-list.test.tsx` (new) — renders rows from a mocked `useResidentVehicles`; clicking Edit fires `onEdit(vehicle)`; clicking Delete opens the confirm dialog; confirm calls `transport.delete`; cache invalidation verified through a mocked `useQueryClient`.

### Frontend role gating

`apps/web/src/features/residents/components/__tests__/access-event-sidebar.test.tsx`:

- Guard role → no `+ Add vehicle` link, no `+ Manage vehicles` link.
- Admin role → both links visible; clicking `+ Manage vehicles` swaps to the manage view.

Equivalent shape for `apps/desktop/src/features/residents/components/__tests__/access-event-sidebar.test.tsx`.

### E2E (Playwright, `apps/web/tests/`)

Lighter coverage:

- One test confirming a guard sees no manage entry points when opening a resident.
- One test confirming an admin can edit a resident vehicle end-to-end and observe the change in the picker afterward.
- One test confirming an admin can delete a resident vehicle and the row disappears from the manage list.

## Implementation order (sketch — refined in the implementation plan)

1. DB migration + repository changes + `pnpm db:types`.
2. API — `UpdateVehicleDto`, `@CurrentUserRole()` decorator, controller PATCH / DELETE, service role checks. Tests.
3. Shared `useRole()` adapter extension (web + desktop adapter implementations updated).
4. Shared `VehicleForm` edit mode + tests.
5. Shared `VehicleManageList` + tests.
6. i18n catalog additions in `@ramcar/i18n`.
7. `AccessEventForm` props for `canManageVehicles` / `onManageVehicles` (gating).
8. Per-app residents `access-event-sidebar.tsx` updates (web, then desktop) + smoke tests.
9. Playwright E2E.
10. Manual QA pass for each role.

## Open considerations (flagged, not blocking)

- **Desktop offline behavior for PATCH / DELETE:** in scope, the transport adapter delivers the call directly; offline → user-visible failure. If admin booth use becomes common, a follow-up adds outbox kinds `vehicle.update` and `vehicle.delete` (mirroring spec 012's `visit_person.update`).
- **`useRole()` adapter** changes are additive; existing call sites continue to destructure only `tenantId`. If a future spec needs more auth state, that adapter is the right place to grow.

