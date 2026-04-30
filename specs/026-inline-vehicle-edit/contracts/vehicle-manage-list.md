# UI Contract: `VehicleManageList` (generalized)

**Branch**: `026-inline-vehicle-edit` | **Date**: 2026-04-29
**File**: `packages/features/src/shared/vehicle-form/vehicle-manage-list.tsx`

This contract documents the prop surface for the generalized `VehicleManageList` component. It is the only component-level breaking change in this feature.

## Imports (unchanged)

```ts
import { VehicleManageList } from "@ramcar/features/shared/vehicle-form";
```

## Prop Shape

```ts
export type VehicleOwner =
  | { kind: "resident";    userId: string }
  | { kind: "visitPerson"; visitPersonId: string };

interface VehicleManageListProps {
  /** Discriminated owner — replaces the prior `residentId` prop. */
  owner: VehicleOwner;

  /** Vehicles to render. The component does not fetch — the parent passes the list. */
  vehicles: Vehicle[] | undefined;

  /** Whether the list is still loading. Parent computes from its query state. */
  isLoading: boolean;

  /**
   * When `false`, the trash icon and the delete confirmation dialog are not rendered.
   * Defaults to `true` to preserve behavior at the existing residents
   * access-event-sidebar call sites where the parent already gates mounting on
   * `canManageVehicles`.
   */
  canDelete?: boolean;

  /** Invoked when the user clicks the pencil icon for a row. */
  onEdit: (vehicle: Vehicle) => void;

  /** Invoked when the user dismisses the manage view (back arrow). */
  onClose: () => void;
}
```

## Diff vs. current shape

| Before | After |
|--------|-------|
| `residentId: string` | `owner: VehicleOwner` (discriminated union) |
| (no role gate) | `canDelete?: boolean` (default `true`) |
| Cache key hardcoded to `"resident"` | Cache key derives from `owner.kind` |
| No internal role check | No internal role check (unchanged — gating stays at parent) |

## Behavior

### Cache key

```ts
const cacheKey = owner.kind === "resident"
  ? (["vehicles", tenantId, "resident", owner.userId] as const)
  : (["vehicles", tenantId, "visit-person", owner.visitPersonId] as const);
```

The component invalidates this key after a successful delete. Both keys match the keys used by the existing fetch hooks (`useResidentVehicles`, `useVisitPersonVehicles`), so the parent's list refreshes automatically.

### Delete affordance gating

- `canDelete === true` (or omitted): trash icon rendered on every row, alongside the pencil. Click opens the existing `AlertDialog` confirm; confirm fires `transport.delete<void>(\`/vehicles/${id}\`)`.
- `canDelete === false`: no trash icon. The confirm dialog is not rendered. The pencil edit affordance remains.

### Edit affordance

Always rendered. `onEdit(vehicle)` is invoked when clicked; the parent decides what to render in response (typically `<VehicleForm mode="edit" vehicle={…} />` inside the same Sheet).

### Empty state

When `vehicles?.length === 0` and not loading: render `<p>{t("vehicles.manage.empty")}</p>`. Existing behavior — preserved.

### Loading state

When `isLoading === true`: render `<p>…</p>` ellipsis (existing placeholder — preserved).

### Toast taxonomy on delete

| Outcome | Toast |
|---------|-------|
| Success (204) | `t("vehicles.messages.deleted")` |
| 403 | `t("vehicles.messages.forbidden")` |
| Other error | `t("vehicles.messages.errorDeleting")` |

All three keys are existing — no catalog change.

## Required Caller Updates

### Existing call sites (prop rename)

```diff
- <VehicleManageList residentId={resident.id} ... />
+ <VehicleManageList owner={{ kind: "resident", userId: resident.id }} ... />
```

Affects:
- `apps/web/src/features/residents/components/access-event-sidebar.tsx:94`
- `apps/desktop/src/features/residents/components/access-event-sidebar.tsx:86`

Both call sites already gate `view === "manage"` on `canManageVehicles`, so they do **not** need to set `canDelete`.

### New call sites

```ts
// Visit-person view (web + desktop) and provider (web + desktop), guard role:
<VehicleManageList
  owner={{ kind: "visitPerson", visitPersonId: person.id }}
  vehicles={vehicles}
  isLoading={isLoadingVehicles}
  canDelete={false}                // ← FR-007: guards see edit-only
  onEdit={(v) => { setEditingVehicle(v); setView("edit-vehicle"); }}
  onClose={() => setView("default")}
/>

// Visit-person view (web + desktop) and provider (web + desktop), admin/super-admin:
<VehicleManageList
  owner={{ kind: "visitPerson", visitPersonId: person.id }}
  vehicles={vehicles}
  isLoading={isLoadingVehicles}
  canDelete={true}                 // (or omit — defaults to true)
  onEdit={(v) => { setEditingVehicle(v); setView("edit-vehicle"); }}
  onClose={() => setView("default")}
/>

// User-sidebar edit-mode for residents (web only), admin/super-admin:
<VehicleManageList
  owner={{ kind: "resident", userId: userData.id }}
  vehicles={residentVehicles}
  isLoading={isLoadingResidentVehicles}
  canDelete={true}
  onEdit={(v) => { setEditingVehicle(v); setSubView("edit-vehicle"); }}
  onClose={() => setSubView("default")}
/>
```

## Tests (extend existing)

`packages/features/src/shared/vehicle-form/vehicle-manage-list.test.tsx` (and the symmetric file under `__tests__/`):

1. **Existing** — render with resident owner, list a vehicle, click pencil → `onEdit` invoked.
2. **Existing** — render with resident owner, click trash → confirm dialog opens, confirm → `DELETE /vehicles/:id` issued.
3. **Existing** — 403 on delete shows `vehicles.messages.forbidden` toast.
4. **NEW** — render with `owner: { kind: "visitPerson", visitPersonId: "vp-1" }` → cache key uses `"visit-person"`, delete invalidates the right key.
5. **NEW** — render with `canDelete={false}` → trash icon is not in the DOM; pencil icon still is.
6. **NEW** — render with `canDelete={false}` and `vehicles=[]` → empty-state message renders normally.

## Compatibility

The owner-prop rename is a TypeScript breaking change but a small one — the two existing call sites are updated in the same PR. No external package consumes `VehicleManageList`.

## Out-of-scope

- No new owner kinds (no "shared" or "company" owner).
- No internal role check inside the component (gating stays at parents per D2).
- No fetching inside the component (parents continue to pass `vehicles` + `isLoading`).
- No change to delete confirmation copy or toast keys.
