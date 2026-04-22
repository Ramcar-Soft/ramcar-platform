# Vehicle dropdown auto-refresh and auto-select — design

Date: 2026-04-21
Status: Draft — pending user review
Branch: dev

## Problem

When a guard creates a new vehicle from the access-event sidebar (for a visitor, a service provider, or a resident), two things go wrong:

1. **The dropdown does not refresh.** The newly created vehicle does not appear in the vehicle `Select` until the page is reloaded or the sidebar is closed and reopened.
2. **The dropdown does not auto-select the new vehicle.** Even after a manual reload, the guard must hunt for the new vehicle and pick it, when in reality they just created it and it is the vehicle they are recording.

Separately, the initial-open behavior auto-selects the first vehicle whenever any exist, which silently makes the wrong choice when there are multiple vehicles.

## Goals

1. A new vehicle created from the access-event sidebar appears in the dropdown immediately — no reload, no sidebar reopen.
2. The newly created vehicle is auto-selected in the access-event form so the guard can immediately press Save.
3. On initial sidebar open, auto-select only when there is exactly one vehicle. For multiple, leave the selection blank so the guard chooses explicitly.
4. Enforce "vehicle is required when access mode = Vehicle" — the Save button stays disabled until a selection exists.
5. Align every vehicle-related React Query key with the `[resource, tenantId, modifier, filters]` convention in `CLAUDE.md` so invalidations match consistently across all apps.

## Non-goals

- No optimistic cache updates (`queryClient.setQueryData` splice). Invalidate-and-refetch is fast enough and keeps one source of truth.
- No refactor to delegate the mutation from `VehicleForm` to per-consumer hooks. The inline mutation is fine once invalidation is correct.
- No redesign of the "+ Add vehicle" UX. The current in-sidebar form swap stays.

## Root cause

`VehicleForm`'s mutation invalidates `["vehicles", "visit-person", visitPersonId]`, but the shared visitors hook at `packages/features/src/visitors/hooks/use-visit-person-vehicles.ts` caches under `["vehicles", tenantId, "visit-person", visitPersonId]`. React Query matches query keys position-by-position, so the `tenantId` at slot `[1]` breaks the prefix match and the cache is never marked stale.

In the providers flow, the per-app hooks happen to match the invalidation key because neither side includes `tenantId`. That incidental match is fragile and violates the documented convention.

## Query key convention (canonical)

Per `CLAUDE.md`: `[resource, tenantId, modifier, filters]`.

| Query | New canonical key |
|---|---|
| Visit-person vehicles | `["vehicles", tenantId, "visit-person", visitPersonId]` |
| Resident vehicles | `["vehicles", tenantId, "resident", residentId]` |

The `VehicleForm` invalidation becomes symmetric:

```ts
const { tenantId } = useRole();

onSuccess: (_data, variables) => {
  const key =
    variables.ownerType === "user"
      ? ["vehicles", tenantId, "resident", variables.userId]
      : ["vehicles", tenantId, "visit-person", variables.visitPersonId];
  queryClient.invalidateQueries({ queryKey: key });
}
```

`useRole()` is already wired into both apps (`WebRoleProvider` at `apps/web/src/shared/lib/features/role.tsx`, `DesktopRoleProvider` at `apps/desktop/src/shared/lib/features/role.tsx`) and exposes `tenantId` via `@ramcar/features/adapters`.

## State flow

### `VehicleForm` — callback signature change

```ts
interface VehicleFormProps {
  // ...existing
  onSaved: (vehicle: Vehicle) => void;  // was: () => void
}
```

The mutation already returns the created `Vehicle` (`transport.post<Vehicle>("/vehicles", data)`); we simply forward it to `onSaved`.

### Sidebar — track the newly created vehicle

Each sidebar (`visit-person-sidebar`, `provider-sidebar` web + desktop, `access-event-sidebar` web + desktop) adds one piece of local state:

```ts
const [justCreatedVehicleId, setJustCreatedVehicleId] = useState<string | null>(null);

<VehicleForm
  onSaved={(vehicle) => {
    setJustCreatedVehicleId(vehicle.id);
    setShowVehicleForm(false);
  }}
  onCancel={handleCloseVehicleForm}
  {...}
/>

<VisitPersonAccessEventForm
  initialVehicleId={justCreatedVehicleId}
  {...}
/>
```

Reset `justCreatedVehicleId` when the selected person or resident changes:

```ts
useEffect(() => { setJustCreatedVehicleId(null); }, [person?.id]);      // visitors + providers
useEffect(() => { setJustCreatedVehicleId(null); }, [resident?.id]);    // residents
```

We reset on identity change rather than sidebar close, so the id survives the `VehicleForm` → `AccessEventForm` remount under the same person/resident.

### Access-event forms — seed + new auto-select rule

Both `AccessEventForm` (residents) and `VisitPersonAccessEventForm` (visitors + providers):

```ts
interface Props {
  // ...existing
  initialVehicleId?: string | null;
}

const [vehicleId, setVehicleId] = useState<string>(
  initialVehicleId ?? initialDraft?.vehicleId ?? "",
);

// Change from "any length" to "exactly one":
useEffect(() => {
  if (accessMode === "vehicle" && vehicles?.length === 1 && !vehicleId) {
    setVehicleId(vehicles[0].id);
  }
}, [accessMode, vehicles, vehicleId]);
```

### Required-vehicle invariant

`canSave = accessMode === "pedestrian" || !!vehicleId` stays as the single source of truth for the Save button's `disabled` prop. It already covers "multiple vehicles, none selected" and "auto-select did not fire."

### Scenario walk-through

| Scenario | Before | After |
|---|---|---|
| 0 vehicles, add one | Dropdown stays empty until reload | New vehicle appears and is selected |
| 1 existing vehicle | Auto-selects it | Auto-selects it (`length === 1`) |
| 3 existing vehicles | Auto-selects first silently | Blank; guard picks; Save disabled until picked |
| 3 existing, add a 4th | Dropdown never refreshes | New vehicle appears and is selected |
| Switch to Pedestrian | `vehicleId` cleared; `canSave` true | Unchanged |

## Error handling and edge cases

- **Mutation error**: no `onSaved` call → no `justCreatedVehicleId` pollution. Existing toast error stays.
- **Prior successful create, then second create errors**: `justCreatedVehicleId` still points at the first success. Correct — that vehicle really exists.
- **Guard switches person/resident mid-flow**: `useEffect` resets `justCreatedVehicleId` on identity change.
- **Refetch race**: micro-window where `vehicleId = newId` but `vehicles` list does not yet contain it. `Select` briefly shows no label; self-resolves on next render. Sub-200ms on localhost.
- **Empty list after mutation (impossible in practice)**: Save stays disabled via `canSave`. Safe-fail.
- **Tenant switching (super-admin impersonation)**: new keys include `tenantId`; React Query caches are tenant-scoped. No cross-tenant bleed.
- **`useFormPersistence` on residents web**: priority `initialVehicleId ?? restoredDraft.vehicleId ?? ""`. A freshly created vehicle wins over a restored draft — correct, since the create is the most recent intent. Pre-existing edge case where a persisted draft references a deleted vehicle is NOT addressed here (separate issue; not regressed).
- **Desktop offline**: vehicle creation is online-only today (per spec 013); no outbox path involved. Network failure hits the normal `onError` path.

## File-level change list

### Shared package — `packages/features/`

1. `src/shared/vehicle-form/vehicle-form.tsx`
   - Import `useRole` from `../../adapters`; read `tenantId`.
   - Change `onSaved: () => void` → `onSaved: (vehicle: Vehicle) => void`.
   - Update mutation `onSuccess` invalidation to the canonical keys.
   - Forward created vehicle to `onSaved(vehicle)`.
2. `src/shared/vehicle-form/vehicle-form.test.tsx`
   - Update existing assertions for new invalidation keys and the `onSaved(vehicle)` signature.
3. `src/visitors/hooks/use-visit-person-vehicles.ts`
   - Already `["vehicles", tenantId, "visit-person", visitPersonId]`. No change.
4. `src/visitors/components/visit-person-access-event-form.tsx`
   - Add `initialVehicleId` prop; seed `useState`; change auto-select rule to `length === 1`.
5. `src/visitors/components/visit-person-sidebar.tsx`
   - Add `justCreatedVehicleId` state; reset on `person?.id`; wire `onSaved(vehicle)`; pass `initialVehicleId` down.

### Web app — `apps/web/`

6. `src/features/providers/hooks/use-visit-person-vehicles.ts`
   - Import `useRole` from `@ramcar/features/adapters`; use `tenantId` in key.
7. `src/features/providers/components/provider-sidebar.tsx`
   - Same pattern as #5.
8. `src/features/residents/hooks/use-resident-vehicles.ts`
   - Import `useRole`; rename key to `["vehicles", tenantId, "resident", residentId]`.
9. `src/features/residents/hooks/use-create-vehicle.ts`
   - Verify usage; delete if unused, otherwise update to the new invalidation keys.
10. `src/features/residents/components/access-event-sidebar.tsx`
    - Same pattern as #5, resetting on `resident?.id`.
11. `src/features/residents/components/access-event-form.tsx`
    - Add `initialVehicleId` prop; seed; change auto-select to `length === 1`. `useFormPersistence` wiring stays.

### Desktop app — `apps/desktop/`

12. `src/features/providers/hooks/use-visit-person-vehicles.ts` — same as #6.
13. `src/features/providers/components/provider-sidebar.tsx` — same as #7.
14. `src/features/residents/hooks/use-resident-vehicles.ts` — same as #8.
15. `src/features/residents/hooks/use-create-vehicle.ts` — same as #9.
16. `src/features/residents/components/access-event-sidebar.tsx` — same as #10.
17. `src/features/residents/components/access-event-form.tsx` — same as #11, minus `useFormPersistence` (no draft layer on desktop today).

## Tests

- `packages/features/src/shared/vehicle-form/vehicle-form.test.tsx` — update existing assertions; assert `onSaved(vehicle)` is called with the created vehicle.
- `packages/features/src/visitors/components/visit-person-access-event-form.test.tsx` (new) — four cases:
  - Auto-selects when `vehicles.length === 1`.
  - Does NOT auto-select when `vehicles.length > 1`.
  - Seeds `vehicleId` from `initialVehicleId`.
  - Save button stays disabled in vehicle mode with no selection.
- `apps/web/src/features/residents/components/__tests__/access-event-form.test.tsx` (new or updated) — mirror the four cases, plus one assertion that `initialVehicleId` beats a restored draft `vehicleId`.
- One integration-level assertion per sidebar test suite: creating a vehicle updates the dropdown and selects it.

## Estimated diff

~15 files touched, ~300 lines net, mostly thin plumbing.

## Follow-ups (out of scope)

- The persisted draft in `useFormPersistence("access-event-create", ...)` can reference a vehicle id that has been deleted between reloads; the Select then renders without a label while `canSave` is true. Worth a separate ticket; not regressed by this change.
- Other catalog modules (not in this fix) may still use React Query keys without `tenantId`. A broader sweep to enforce the CLAUDE.md convention is a worthwhile follow-up but is explicitly out of scope here.
