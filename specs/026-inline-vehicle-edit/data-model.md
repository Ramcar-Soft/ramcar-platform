# Phase 1 Data Model: Inline Vehicle Edit and Delete in Person Sidebars

**Branch**: `026-inline-vehicle-edit` | **Date**: 2026-04-29

This feature **does not introduce or modify any persisted entity**. There is no PostgreSQL schema change, no Supabase Storage change, no SQLite change, no new outbox column. This document inventories the entities the feature reads and mutates, and captures the in-memory UI shapes that change as a consequence of D1–D3 in `research.md`.

## Reused Entities

### Vehicle (unchanged — see `packages/shared/src/types/vehicles.ts` and `apps/api/src/modules/vehicles/`)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` (UUID) | Primary key |
| `tenantId` | `string` (UUID) | Multi-tenant isolation; injected by API guard |
| `userId` | `string \| null` | Resident owner, mutually exclusive with `visitPersonId` |
| `visitPersonId` | `string \| null` | Visit-person owner, mutually exclusive with `userId` |
| `vehicleType` | `"car" \| "motorcycle" \| "bicycle" \| "truck" \| "van" \| "other"` | (existing type) |
| `brand` | `string \| null` | Free-text or canonical brand name |
| `model` | `string \| null` | Free-text or canonical model name |
| `plate` | `string \| null` | Plate identifier |
| `color` | `string \| null` | Hex (e.g. `"#FF0000"`) or legacy color name |
| `notes` | `string \| null` | Free-text annotation |
| `year` | `number \| null` | Manufacture year |
| `createdAt` | `string` (ISO 8601) | Server-set |
| `updatedAt` | `string` (ISO 8601) | Server-set |
| `deletedAt` | `string \| null` (ISO 8601, **server-only**) | Soft-delete marker; not exposed in `Vehicle` DTO |

**Relationships unchanged**: a `Vehicle` belongs to exactly one of `User` (resident) or `VisitPerson`. The discriminator is encoded in the schema by exactly one of `userId` / `visitPersonId` being non-null.

**Operations exercised by this feature**:
- `GET /api/vehicles?userId=…` → list a resident's vehicles (used in user-sidebar edit mode for residents)
- `GET /api/vehicles?visitPersonId=…` → list a visit-person's vehicles (used in visit-person/provider sidebars)
- `PATCH /api/vehicles/:id` → update an existing vehicle
- `DELETE /api/vehicles/:id` → soft-delete an existing vehicle

**Validation rules (unchanged)**: `updateVehicleSchema` from `@ramcar/shared` is reused verbatim. All fields optional in PATCH; the schema validates types, plate length bounds, and year ranges.

**State transitions (unchanged)**: `existing → updated`, `existing → soft-deleted`. Soft delete sets `deletedAt`; `findByUserId` and `findByVisitPersonId` filter rows where `deletedAt IS NULL`.

### Person (User-as-resident or VisitPerson — both unchanged)

| Variant | Source | Identity field |
|---------|--------|----------------|
| Resident | `profiles` table → `User` DTO | `User.id` |
| Visitor | `visit_persons` table, `type='visitor'` → `VisitPerson` DTO | `VisitPerson.id` |
| Service Provider | `visit_persons` table, `type='provider'` → `VisitPerson` DTO | `VisitPerson.id` |

**Read by this feature** (to know whose vehicles to fetch and to scope the role gate):
- The user-sidebar in edit mode reads `User.role` to decide whether the vehicle list section is mounted (FR-003 / FR-008).
- The visit-person and provider sidebars do not need to read the person back; they only need the person's id, which is already in the sidebar's `person` prop.

**Mutated by this feature**: never. Vehicle edit and delete MUST NOT touch the person record (SC-004).

## In-memory UI Shapes (changed by this feature)

These types live in TypeScript only — they are not persisted.

### `VehicleOwner` (new, defined in `packages/features/src/shared/vehicle-form/vehicle-manage-list.tsx`)

```ts
export type VehicleOwner =
  | { kind: "resident";    userId: string }
  | { kind: "visitPerson"; visitPersonId: string };
```

Used as the discriminated `owner` prop on the generalized `VehicleManageList`. The cache key derives from this:

```ts
const cacheKey = owner.kind === "resident"
  ? (["vehicles", tenantId, "resident", owner.userId] as const)
  : (["vehicles", tenantId, "visit-person", owner.visitPersonId] as const);
```

This shape replaces the prior `residentId: string` prop. The two existing call sites (`apps/web/.../residents/access-event-sidebar.tsx`, `apps/desktop/.../residents/access-event-sidebar.tsx`) update to:

```ts
<VehicleManageList owner={{ kind: "resident", userId: resident.id }} ... />
```

The four new call sites (visit-person-sidebar, provider-sidebar web + desktop, user-sidebar web) pick the appropriate variant.

### `SidebarView` (extended in three files — `visit-person-sidebar`, `provider-sidebar` web + desktop)

```ts
type SidebarView = "default" | "create-vehicle" | "manage" | "edit-vehicle";
```

The visit-person-sidebar's existing `showVehicleForm: boolean` is folded into this union (`true` → `"create-vehicle"`, `false` → `"default" | "manage" | "edit-vehicle"`). The state machine pattern is identical to the one already in `apps/web/src/features/residents/components/access-event-sidebar.tsx:20`.

Companion state: `editingVehicle: Vehicle | null` — set when transitioning to `"edit-vehicle"`, cleared when returning. Same shape as `access-event-sidebar.tsx:55`.

### `UserSidebar` view shape (web only)

The user-sidebar already has a binary `mode: "create" | "edit"`. This feature adds an embedded sub-state that lives _within_ the edit-mode body:

```ts
type EditModeSubView = "default" | "manage" | "edit-vehicle";
```

When `mode === "edit"` and `userData.role === "resident"` and the actor is admin/super-admin:

- `subView === "default"`: render `<UserForm mode="edit" />` and below it `<VehicleManageList ... />` (always visible alongside the user form).
- `subView === "edit-vehicle"`: replace both the form and the manage list with `<VehicleForm mode="edit" />`. On save/cancel, return to `"default"`.

For `mode === "edit"` with a non-resident user, no vehicle UI is rendered. For `mode === "create"`, the existing inline-vehicle-section logic from spec 025 is unchanged.

The `manage` sub-view as a separate state is not needed for the user-sidebar because the manage list is co-rendered with the user form rather than replacing it. (This differs from the visit-person-sidebar, where view-mode shows the access-event form and clicking "manage vehicles" replaces it — there the list is conceptually a distinct sub-screen.)

### Picker stale-selection cleanup (`AccessEventForm`, `VisitPersonAccessEventForm`)

A single `useEffect` is added inside each picker:

```ts
useEffect(() => {
  if (selectedVehicleId && vehicles && !vehicles.some(v => v.id === selectedVehicleId)) {
    setSelectedVehicleId("");
  }
}, [vehicles, selectedVehicleId]);
```

No new state, just a reactive cleanup. See D5 in `research.md`.

## Cache Keys (no changes — documented for completeness)

| Owner | Query key shape |
|-------|----------------|
| Resident | `["vehicles", tenantId, "resident", userId]` |
| Visit-person | `["vehicles", tenantId, "visit-person", visitPersonId]` |

Both keys are already used by:
- `useResidentVehicles(residentId)` (`apps/web/src/features/residents/hooks/use-resident-vehicles.ts:11`)
- `useVisitPersonVehicles(visitPersonId)` (`packages/features/src/visitors/hooks/use-visit-person-vehicles.ts:10`)
- `<VehicleForm />`'s success invalidation (`packages/features/src/shared/vehicle-form/vehicle-form.tsx:111`)
- `<VehicleManageList />`'s delete invalidation (`packages/features/src/shared/vehicle-form/vehicle-manage-list.tsx:44`)

The shared component invalidates whichever key matches the discriminated owner; no parent has to plumb a key through.

## API Contract Changes (FR-012 only)

`DELETE /api/vehicles/:id` — behavior tightens for guards. Today: rejected when the vehicle is owned by a resident (`existing.user_id !== null`). After this feature: rejected for **any** vehicle when the actor is a guard, regardless of owner.

| Actor role | Owner | Before | After |
|------------|-------|--------|-------|
| `super_admin` | resident | 204 | 204 |
| `super_admin` | visit-person | 204 | 204 |
| `admin` | resident | 204 | 204 |
| `admin` | visit-person | 204 | 204 |
| `guard` | resident | 403 | 403 |
| `guard` | visit-person | **204** | **403** ← changed |

`PATCH /api/vehicles/:id` — no behavior change. Existing rule preserved (FR-013): guards may update visit-person vehicles, may not update resident vehicles.

| Actor role | Owner | Before | After |
|------------|-------|--------|-------|
| `super_admin` | any | 200 | 200 |
| `admin` | any | 200 | 200 |
| `guard` | resident | 403 | 403 |
| `guard` | visit-person | 200 | 200 |

`GET /api/vehicles?userId=…` and `GET /api/vehicles?visitPersonId=…` — no behavior change.

## Out-of-scope (explicitly)

- No change to `Vehicle` DTO fields.
- No change to `updateVehicleSchema`.
- No new owner type (no "company" or "shared" owner).
- No change to soft-delete semantics.
- No new `vehicleType` value.
- No change to brand/model registries.
- No new `vehicles.*` i18n keys.
- No new desktop outbox operation kinds.
- No change to access-event records that reference deleted vehicles (they continue to display the historical label per existing behavior).
