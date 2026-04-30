# Phase 0 Research: Inline Vehicle Edit and Delete in Person Sidebars

**Branch**: `026-inline-vehicle-edit` | **Date**: 2026-04-29

This document resolves the open design questions raised by the spec — there are no `NEEDS CLARIFICATION` markers in the technical context, so research focuses on the three judgment calls the implementation must commit to before code is written.

## D1 — How to generalize `VehicleManageList` for two owner kinds without forking

### Decision

Replace the `residentId: string` prop with a discriminated union:

```ts
type VehicleOwner =
  | { kind: "resident"; userId: string }
  | { kind: "visitPerson"; visitPersonId: string };

interface VehicleManageListProps {
  owner: VehicleOwner;                                  // ← was: residentId
  vehicles: Vehicle[] | undefined;
  isLoading: boolean;
  canDelete?: boolean;                                   // ← new, default true
  onEdit: (vehicle: Vehicle) => void;
  onClose: () => void;
}
```

The cache key derives mechanically from `owner.kind`:

```ts
const cacheKey = owner.kind === "resident"
  ? (["vehicles", tenantId, "resident", owner.userId] as const)
  : (["vehicles", tenantId, "visit-person", owner.visitPersonId] as const);
```

This matches the keys already used by `useResidentVehicles` (`apps/web/src/features/residents/hooks/use-resident-vehicles.ts:11`) and `useVisitPersonVehicles` (`packages/features/src/visitors/hooks/use-visit-person-vehicles.ts:10`). The component invalidates the right cache for whichever owner the parent passes, with no per-call-site wiring.

### Rationale

- **No fork** (FR-004): the spec is explicit that the existing component must be reused, not duplicated.
- **TypeScript narrowing forces correctness**: every parent must pick a kind. Passing both or neither is a compile error. This is stronger than two optional props (`userId?` + `visitPersonId?`) which would let a caller pass both or neither and force runtime `if`s.
- **Cache-key locality**: keeping the cache-key computation inside the component (rather than asking the parent to pass it) means that an existing or new caller cannot accidentally invalidate the wrong list. The discriminated union is the single source of truth for both the `transport.delete` URL (always `/vehicles/${id}` — not owner-specific) and the cache invalidation key.
- **Default-true `canDelete`** keeps the existing residents access-event-sidebar call site free of new permission wiring beyond the owner-prop rename. The two existing call sites (`apps/web/src/features/residents/components/access-event-sidebar.tsx:94-104` and the desktop symmetric) already gate `view === "manage"` on `canManageVehicles`, so they only render the component when the user is admin/super-admin — `canDelete` defaulting to `true` preserves the current "if mounted, the trash icon is visible" semantics. Only the visit-person flow needs `canDelete={false}` (for guard role).

### Alternatives considered

- **Two optional props (`userId?`, `visitPersonId?`)**: rejected — invites runtime branching, allows invalid states (both set, neither set), and produces less helpful TS errors than a discriminated union.
- **Generic `ownerType: "user" | "visitPerson"; ownerId: string` pair**: rejected — TypeScript cannot prove the pair is consistent (e.g., `ownerType: "user"; ownerId: <a visit-person UUID>`); pairs need an `if` to convert into the right cache key. The discriminated union expresses the same constraint at the type level.
- **Keep the prop as `residentId` and add a separate `<VehicleManageListForVisitPerson />` wrapper**: rejected — that's the fork FR-004 explicitly disallows.
- **Move cache key into a callback prop the parent computes**: rejected — splits the source of truth and lets two parents disagree on the key shape; today both keys already follow the same `["vehicles", tenantId, ownerKind, ownerId]` shape so there is no real flexibility to expose.

## D2 — Where the role gate lives (UI side)

### Decision

The role gate lives at the **parent sidebar**, not inside `VehicleManageList`. The parent computes:

- `canManageVehicles = role === "Admin" || role === "SuperAdmin"` — gates whether the user can see the manage-vehicles UI at all on a resident.
- `canDelete = canManageVehicles` for resident owners, **and** `canDelete = canManageVehicles` for visit-person owners — i.e., delete requires admin/super-admin in both flows. Guards on visit-person rows pass `canDelete={false}` to keep the edit affordance visible per FR-007.
- For the user-edit sidebar specifically, the section is conditionally mounted: `mode === "edit" && userData.role === "resident" && (role === "Admin" || role === "SuperAdmin")`. Guards never reach the user catalog edit (existing rule), so the conjunction is mostly defense in depth — but it makes the FR-008 invariant explicit and testable.

`VehicleManageList` itself receives a single boolean (`canDelete`) and a single owner discriminated union. It does not import `useRole` for the purpose of hiding the trash icon. (It may keep `useRole` for `tenantId` to compute the cache key — that's an existing use, not a permission decision.)

### Rationale

- **Symmetry with the existing access-event-sidebar pattern** (`apps/web/src/features/residents/components/access-event-sidebar.tsx:52`): `canManageVehicles` is computed once at the parent and used both to gate the entry point ("manage vehicles" button visibility) and to wrap the manage view. The new sidebars adopt the same shape, with the addition of a separate `canDelete` flag that diverges from `canManageVehicles` in exactly one case (guard + visit-person owner).
- **Easier to read and audit**: the role logic for "who can delete on which surface" is in 2-3 lines of the parent component, in plain sight, alongside the rest of the sidebar's permission decisions. Hiding it inside `VehicleManageList` would split it across two files.
- **Defense in depth at the API layer is the authoritative enforcement** (Constitution Principle VI). The UI gate is a usability + safety layer; the FR-012 service-level reject is the security layer. The two are separately tested.

### Alternatives considered

- **Internal `useRole()` check inside `VehicleManageList`**: rejected — couples the shared component to a specific role-name shape (`"Guard"` vs `"guard"` — the adapter uses PascalCase, the API uses lowercase). Keeping role logic at the parent means the shared component stays a pure presentation surface that takes a flag.
- **Passing the full role to the list**: rejected for the same coupling reason. A boolean is the minimum sufficient prop for the decision the component must make.
- **A second wrapper component that hides the trash icon**: rejected — extra indirection for a one-line conditional.

## D3 — Sidebar view-state machine reuse

### Decision

All four sidebars (`visit-person-sidebar`, `provider-sidebar` web + desktop, web `user-sidebar`) adopt the same state machine that `access-event-sidebar` already uses:

```ts
type SidebarView = "default" | "create-vehicle" | "manage" | "edit-vehicle";
const [view, setView] = useState<SidebarView>("default");
const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
```

The `default` view is the surface's primary content — for the visit-person sidebar in view mode that is the access-event form; for the user-sidebar in edit mode that is the user edit form. The `manage`, `create-vehicle`, and `edit-vehicle` views are sub-views inside the same Sheet body and share the same back-navigation pattern (Cancel / "back arrow" returns to the appropriate previous view).

Two layout patterns are used:

- **Sub-view replacement** (visit-person, provider, residents access-event): when in `manage`, `create-vehicle`, or `edit-vehicle`, the primary content (access-event form) is replaced. This is what `access-event-sidebar.tsx:82-138` already does and the visitor sidebar's existing `showVehicleForm` boolean (`visit-person-sidebar.tsx:185-217`) follows the same pattern. We extend it to a 4-state enum.
- **Embedded section** (user-sidebar, edit mode): the `manage` block is rendered _below_ the user edit form rather than replacing it, because the admin may want to edit user fields and vehicles in one sitting without bouncing between views. `manage` is therefore the default sub-state when the user form is being edited; clicking pencil on a row transitions to `edit-vehicle` (which _does_ replace the form, because the vehicle form is itself a full form). The visit-person sidebar's edit mode adopts the same embedded pattern (FR-002 — edit mode also exposes the list).

The transitions are:

```text
                   pencil clicked
default ────────► (manage)        ─────────► edit-vehicle
   │                  │                          │
   │                  │ X / cancel               │ saved / cancel
   │                  ▼                          ▼
   │                default                   manage
   │
   │ "+ add vehicle" (already exists in current sidebars)
   ▼
create-vehicle ─────► default
        cancel /
        saved
```

### Rationale

- **Battle-tested pattern**: the existing `access-event-sidebar` has been in production (per spec 010, 011, 022) and the desktop symmetric uses the same shape. Reusing it eliminates a class of bugs ("did we wire the back navigation right?").
- **Bounded states**: 4 named views, no `boolean` flags, no implicit "either A or B is shown" combinations. Each component renders the matching view; the rest are unmounted.
- **Cleanup is a single line**: `useEffect(() => { setView("default"); setEditingVehicle(null); }, [person?.id])` resets when the parent switches the entity, mirroring the existing access-event-sidebar reset (`access-event-sidebar.tsx:58-63`).

### Alternatives considered

- **Keep using a boolean (`showVehicleForm`) and add another boolean (`showManageList`) and another (`showEditForm`)**: rejected — combinatorial explosion, easy to render two views simultaneously by mistake, harder to reset.
- **Lift state to parent (visitors-view, providers-page-client)**: rejected — these are sub-views inside the Sheet that should not survive a Sheet close-and-reopen; lifting them adds prop plumbing across files for no gain. The existing access-event-sidebar correctly keeps this state local.
- **Use a router for sub-views**: rejected — violates the "Create / Edit forms — right-side Sheet, never a dedicated page" non-negotiable in `CLAUDE.md`.

## D4 — How the access-event vehicle picker refreshes after edit/delete (FR-011)

### Decision

The picker refreshes via TanStack Query cache invalidation, which is already wired:

- `<VehicleForm mode="edit" />` calls `queryClient.invalidateQueries({ queryKey: cacheKey })` on success (`vehicle-form.tsx:117-128`). The cache key is `["vehicles", tenantId, ownerKind, ownerId]`.
- `VehicleManageList`'s delete mutation does the same (`vehicle-manage-list.tsx:46-51`).
- The pickers (`AccessEventForm` for residents, `VisitPersonAccessEventForm` for visitors/providers) read from the same cache via the same hooks — they re-render automatically when the cache updates.

The "just-edited vehicle's id" pre-selection in the picker (FR-001 acceptance scenario 2) reuses the existing `justCreatedVehicleId` plumbing: when the manage-list edit completes, the parent stores the vehicle id and the picker's `initialVehicleId` prop updates. (Renaming the variable to `lastEditedVehicleId` is unnecessary — its semantics already match "the vehicle the user just touched" and the picker doesn't care which mutation produced it.)

### Rationale

- **Zero new wiring**: the cache invalidation cascades through every component reading the same query key. No imperative refetch is needed.
- **Consistent with how spec 025 handled "just-created vehicle id"**: same pattern, same prop name, same lifecycle.

### Alternatives considered

- **Imperative `refetch()` from the parent**: rejected — duplicates what TanStack Query already does and creates two refresh paths that can desync.
- **Introduce a new "just-touched vehicle id" state**: rejected — the existing `justCreatedVehicleId` is general enough to cover edit too. The picker pre-select rule is "select whatever the user last touched", not "select only newly-created vehicles".

## D5 — Stale-selection cleanup when the picker's currently-selected vehicle is deleted (edge case)

### Decision

The picker's `<Select value={vehicleId} …>` reads `vehicleId` from local state. When the user deletes a vehicle that happens to be the currently selected one, the cache invalidation drops the row from the `vehicles` array, but the picker's `value` prop (still pointing at the deleted id) becomes stale. We clear it: in the `default`-view return path of the sidebar, on transition from `manage` back to `default`, the parent compares the previously-selected vehicle id against the freshly-loaded list; if it's missing, it resets the local picker state. Alternatively the picker itself effects a `useEffect` on `vehicles` that clears the selection if `!vehicles.some(v => v.id === selected)`.

The acceptance criterion (spec edge case "Vehicle currently selected in the access-event picker is deleted") says the picker MUST refresh and selection MUST become empty if the selection was deleted. We implement this in the picker (`AccessEventForm` and `VisitPersonAccessEventForm`) since they own the selection state and already react to changes in `vehicles` for label rendering.

### Rationale

- **Local to the picker**: only the picker has both the live `vehicles` array and the current selection state. Putting the cleanup elsewhere would require lifting selection state up.
- **No new prop**: a single `useEffect(() => { if (selected && !vehicles?.some(v => v.id === selected)) setSelected(""); }, [vehicles, selected])` block is sufficient.
- **Behavior matches the existing "just-created vehicle id auto-select"** (which also runs in `useEffect` on `vehicles`): the picker is already vehicles-list-aware.

### Alternatives considered

- **No cleanup; let the picker show an empty <Select> with a stale `value` and let the user notice**: rejected — leaves the form in a state that submits a deleted vehicle id, which the API would reject with 404. The UI must not allow that submission.
- **Block deletion when the vehicle is currently selected**: rejected — out of scope and adds a confusing "save the access event first to delete this vehicle" UX. The spec's edge case explicitly accepts the "selection becomes empty" outcome.

## D6 — i18n: are new strings needed?

### Decision

No new keys. The complete inventory of strings this feature needs is already in `@ramcar/i18n/messages/en.json` and `es.json`:

| String purpose | Existing key |
|----------------|--------------|
| Section title in the manage view | `vehicles.manageTitle` |
| Empty-state message in the list | `vehicles.manage.empty` |
| Edit row affordance | `vehicles.manage.editAction` |
| Delete row affordance | `vehicles.manage.deleteAction` |
| Delete confirmation dialog title | `vehicles.deleteConfirm.title` |
| Delete confirmation dialog body | `vehicles.deleteConfirm.description` (takes `{label}` interpolation) |
| Delete confirmation confirm button | `vehicles.deleteConfirm.confirm` |
| Delete confirmation cancel button | `vehicles.deleteConfirm.cancel` |
| Edit success toast | `vehicles.messages.updated` |
| Edit error toast (generic) | `vehicles.messages.errorUpdating` |
| Delete success toast | `vehicles.messages.deleted` |
| Delete error toast (generic) | `vehicles.messages.errorDeleting` |
| Forbidden toast (403 from API) | `vehicles.messages.forbidden` |
| Edit-mode form title | `vehicles.editTitle` |
| Edit-mode submit label | `vehicles.form.update` |

All keys above are already used by the existing `<VehicleForm mode="edit" />` and `<VehicleManageList />`. The new sidebars consume them through the same components — no new strings cross the boundary into the host apps.

### Rationale

FR-018 prefers reuse over new keys; FR-018's listed candidate keys are exactly the existing set. Confirming the inventory closes the question without adding catalog churn.

### Alternatives considered

- **Add a "manage vehicles" entry-point button label** (e.g., `vehicles.manageButton`): not needed — the entry-point text in the `access-event-sidebar` is already keyed (`vehicles.manageVehicles`, line 256 of the catalog), and visit-person-sidebars use the same key.

## D7 — Desktop offline behavior for vehicle edit/delete

### Decision

Edit and delete go through the existing transport adapter. We do not introduce new outbox kinds. If the desktop adapter currently routes `vehicle.update` and `vehicle.delete` through the outbox, they queue while offline; if it routes them through HTTP only, they fail offline. Either way, the behavior matches what the residents access-event-sidebar on desktop already exhibits today (it has been in production with the same `VehicleManageList`).

### Rationale

- **Spec assumption matches reality**: the spec's `Edge Cases` section explicitly defers to "whatever the existing transport supports". No regression is introduced because the same component is being mounted on more surfaces with the same transport.
- **Out-of-scope creep is the wrong call**: introducing offline support for vehicle update/delete would be a separate spec — the spec explicitly avoids it.

### Alternatives considered

- **Add new outbox kinds for `vehicle.update` and `vehicle.delete`**: rejected — out of scope; significant additional design and conflict-resolution work.
- **Block the manage UI on desktop when offline**: rejected — over-eager, and inconsistent with how the existing residents access-event flow on desktop behaves today.

## Summary

| ID | Topic | Decision (one-liner) |
|----|-------|----------------------|
| D1 | Generalize `VehicleManageList` owner | Discriminated-union prop `owner`, internal cache-key derivation, default-true `canDelete` flag |
| D2 | UI role gate placement | Parent sidebar computes `canDelete`; component receives a boolean |
| D3 | Sidebar view-state machine | Reuse the existing 4-state machine from `access-event-sidebar` across all four new sidebars |
| D4 | Picker refresh after edit/delete | Existing TanStack Query cache invalidation suffices — no new wiring |
| D5 | Stale picker selection cleanup | `useEffect` in the picker clears `value` when its id disappears from `vehicles` |
| D6 | i18n | No new keys; reuse the existing `vehicles.*` set |
| D7 | Desktop offline | Reuse existing transport behavior; no new outbox kinds |

All open questions resolved. Phase 1 design proceeds.
