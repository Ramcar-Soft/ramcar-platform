# Phase 1 Data Model — Inline Vehicle Creation in Person Create Form

**Branch**: `025-inline-vehicle-create`
**Status**: Complete

This feature introduces **no persistent entities** and **no schema changes**. The only new entity is a UI-only state shape that exists in the React tree during the create flow.

## 1. Persistent entities (reused — no changes)

| Entity | Source | Used by | Field shape |
|--------|--------|---------|-------------|
| `Profile` (residents — `role === "resident"`) | `public.profiles` | `POST /api/users` | unchanged — see spec 020 / 008 |
| `VisitPerson` (visitors + providers) | `public.visit_persons` | `POST /api/visit-persons` | unchanged — see spec 011 |
| `Vehicle` | `public.vehicles` | `POST /api/vehicles` | unchanged — see spec 011 / 016 / 017 |

All three rows are written through their existing NestJS endpoints and existing repository layers. No new columns, no new indices, no new RLS policies, no new triggers.

## 2. Reused Zod schemas (no changes)

| Schema | Path | Used by |
|--------|------|---------|
| `createVehicleSchema` | `packages/shared/src/validators/vehicle.ts` (line 30) | `<InlineVehicleSection />` row submission |
| `CreateVehicleInput` | derived from `createVehicleSchema` | `useInlineVehicleSubmissions` mutation type |
| `createUserSchema` | `packages/shared/src/validators/user.ts` (existing) | `UserForm` person submission (unchanged) |
| `createVisitPersonSchema` | `packages/shared/src/validators/visit-person.ts` (existing) | `VisitPersonForm` / `ProviderForm` (unchanged) |

The discriminated union on `ownerType` in `createVehicleSchema` is exactly what makes the inline section work without code duplication: each row builds either an `{ ownerType: "user", userId }` or an `{ ownerType: "visitPerson", visitPersonId }` payload depending on which host form mounted it.

## 3. New UI-only entity: `InlineVehicleEntry`

```ts
type InlineVehicleEntryStatus = "draft" | "saving" | "saved" | "error";

interface InlineVehicleEntryFields {
  /** Stable client-generated id (crypto.randomUUID). Used as React key and as
   *  the entry handle the orchestrator addresses for retries. NOT a database id. */
  clientId: string;
  vehicleType: VehicleType | "";
  brand: string;
  model: string;
  plate: string;
  color: string;
  year: number | null;
  notes: string;
}

interface InlineVehicleEntry extends InlineVehicleEntryFields {
  status: InlineVehicleEntryStatus;

  /** Set only after status === "saved". Returned by POST /api/vehicles. */
  vehicleId?: string;

  /** Set only when status === "error". Localized message key or backend message. */
  errorMessage?: string;

  /** Set only when status === "error" and the failure is field-specific
   *  (e.g., plate uniqueness). Drives field-level rendering inside the row. */
  fieldErrors?: Partial<Record<keyof InlineVehicleEntryFields, string>>;
}
```

### Lifecycle / state transitions

```
              ┌──────────┐
   Add row →  │  draft   │
              └────┬─────┘
                   │ user submits the parent form
                   │ AND person create has succeeded (or already done)
                   ▼
              ┌──────────┐
              │ saving   │
              └────┬─────┘
              ┌────┴─────────────────────────┐
              │                              │
   2xx ───────▼─────────         4xx/5xx ────▼──────────
   ┌──────────┐                   ┌──────────┐
   │  saved   │                   │  error   │
   └──────────┘                   └────┬─────┘
   (read-only badge)                   │ user clicks Save again
                                       │ OR fixes field then Save
                                       ▼
                                 ┌──────────┐
                                 │ saving   │
                                 └──────────┘
                                 (retried)
```

Rules:

- An entry NEVER moves from `"saved"` back to `"draft"` / `"saving"` / `"error"`. Once saved, it is locked.
- The user MAY remove an entry while it is in `"draft"` or `"error"` status; removing a `"saved"` entry from the inline section is not supported (use the post-create edit/manage surface).
- A row in `"saving"` status disables its own remove button to prevent racing the in-flight request.
- The parent form's Save button is disabled while ANY row is in `"saving"` status.

### Validation rules per row

- Each row is validated through `createVehicleSchema` AT submit time, not on every keystroke. Per-field invalid states (e.g., year out of range) come from the same `safeParse` call as the standalone `VehicleForm` uses today. There is no duplicated validation logic.
- A row whose `vehicleType` is empty is treated as "incomplete draft" and is silently skipped at submit time (the user can still see it; if they explicitly want to submit it, they must pick a type). This matches the existing `VehicleForm` Save-button-disabled-when-no-type rule.
- A row whose ownerKind is `"resident"` AND the actor's role is `"guard"` is BLOCKED at submit time by the orchestrator (an error is set without dispatching the API call) AND will be rejected by the API on the off-chance the UI gate is bypassed. This is the FR-008 defense-in-depth contract.

## 4. Orchestration state (`useInlineVehicleSubmissions`)

```ts
interface InlineVehicleSubmissionsState {
  /** The inline rows currently displayed in the section. */
  entries: InlineVehicleEntry[];

  /** Once a person has been created in this submit cycle, the orchestrator
   *  remembers the id so a partial-failure retry does NOT re-create the person.
   *  Reset only when the parent sidebar closes. */
  personId: string | null;

  /** Disambiguates which API surface the vehicles are owned by. */
  ownerKind: "resident" | "visitPerson";

  /** True while ANY entry is in "saving" status. Drives the parent Save-button
   *  disabled state. */
  isSubmittingAny: boolean;

  /** True when every entry that the user expects to save is in "saved" status
   *  (i.e., no draft and no error rows). Drives the "all done — close sidebar"
   *  decision in the host. */
  allSaved: boolean;
}

interface InlineVehicleSubmissionsActions {
  addEntry(): void;
  removeEntry(clientId: string): void;
  updateEntry(clientId: string, patch: Partial<InlineVehicleEntryFields>): void;

  /** Called by the host's onSubmit. The host has already received a personId
   *  (or it's stored in this hook from a prior partial submit). The hook
   *  iterates entries with status "draft" or "error", calls POST /vehicles
   *  for each in sequence, and returns when done. */
  submitAll(personId: string, ownerKind: "resident" | "visitPerson"): Promise<{
    saved: InlineVehicleEntry[];
    failed: InlineVehicleEntry[];
  }>;

  /** Called when the host sidebar closes. Resets personId; entries are
   *  unmounted with the section. */
  reset(): void;
}
```

### Orchestrator invariants

1. After `submitAll` returns, every entry has either status `"saved"` or `"error"`. No entry remains in `"draft"` or `"saving"`. (Entries the user didn't fully fill — e.g., empty `vehicleType` — are dropped silently before the API loop and remain as `"draft"` rows in the next render.)
2. `submitAll` MUST be awaited in sequence. The implementation uses a `for…of` loop with `await`. Concurrent calls are not supported; the orchestrator throws if `submitAll` is called while `isSubmittingAny` is true.
3. After every `"saved"` transition, the orchestrator invalidates `["vehicles", tenantId, ownerKind, ownerId]` so any open list view re-fetches.
4. The orchestrator NEVER calls `POST /api/users` or `POST /api/visit-persons`. Person creation is the host's responsibility; the orchestrator only handles vehicles.

## 5. Form draft persistence (web user form only)

`useFormPersistence` already serializes `formData` to `localStorage` under `user-create` and `user-edit-<id>`. This feature widens the snapshot to include an `inlineVehicles` array of `InlineVehicleEntryFields` (NOT the full `InlineVehicleEntry` — status / vehicleId / errors are omitted, as documented in research §5).

```ts
// Existing shape (web only):
interface PersistedUserDraft {
  // …all existing UserFormData fields…
  inlineVehicles?: InlineVehicleEntryFields[]; // NEW (additive, optional)
}
```

On restore, every `inlineVehicles` row is reconstructed as an `InlineVehicleEntry` with `status: "draft"` and a fresh `clientId`. No status is persisted across reloads — by design.

Desktop is unchanged: no `useFormPersistence` equivalent and not in scope.

## 6. Cross-feature touch points

- **Visitors → access-event step**: `VisitPersonSidebar` already maintains `justCreatedVehicleId` (`packages/features/src/visitors/components/visit-person-sidebar.tsx:99`). After a successful inline create with exactly one saved vehicle, the orchestrator's host (`VisitorsView.handleCreatePerson`) sets that state to the saved vehicle's id, and the access-event vehicle picker's `initialVehicleId` prop pre-selects it. No new state is added to the sidebar.
- **Providers (web + desktop)**: same pattern as visitors — `ProviderSidebar` carries the same `justCreatedVehicleId` state today. The web and desktop variants both consume the orchestrator's `submitAll` result and forward the single-vehicle-id when applicable.
- **Residents (web)**: success closes the sidebar; `useUsers` query is invalidated by the existing `useCreateUser` hook (no change). The vehicle invalidation handles the resident's new vehicles list.

## 7. What is explicitly NOT in this data model

- No batch-create endpoint, no batch DTO.
- No idempotency-key column.
- No new RLS policies. Existing policies on `public.vehicles` already enforce tenant isolation and the resident-vs-visit-person ownership check.
- No new desktop SQLite columns (the create flow is online-only — see research §2).
- No new outbox kinds (offline create of vehicles owned by a person who themselves was just created offline is out of scope; visitor/provider create is online-only today and remains so).
- No new shared-features.json entries (the inline section is a sibling export inside the existing shared `vehicle-form` primitive, which is already in the manifest indirectly through the visitors migration entry).

## 8. Example payloads

A guard at the booth registers a visitor "Pedro" with one car (plate `XYZ-001`):

```http
POST /api/visit-persons
{
  "type": "visitor",
  "fullName": "Pedro",
  "status": "flagged",
  "residentId": "…",
  "notes": ""
}

→ 201 { "id": "vp_pedro", "code": "V-1234", "fullName": "Pedro", … }

POST /api/vehicles
{
  "ownerType": "visitPerson",
  "visitPersonId": "vp_pedro",
  "vehicleType": "car",
  "plate": "XYZ-001",
  "brand": "Toyota",
  "model": "Corolla",
  "color": "#0A0A0A"
}

→ 201 { "id": "veh_001", "tenantId": "…", "visitPersonId": "vp_pedro", … }
```

The sidebar then transitions to the access-event step with `vehicle_id = "veh_001"` pre-selected in the picker.

An admin onboards a resident "Ana" with two cars:

```http
POST /api/users   (resident profile)
→ 201 { "id": "p_ana", … }

POST /api/vehicles  { ownerType: "user", userId: "p_ana", … plate ABC-1 … }
→ 201 { "id": "veh_010" }

POST /api/vehicles  { ownerType: "user", userId: "p_ana", … plate ABC-2 … }
→ 201 { "id": "veh_011" }
```

Sidebar closes; users table refreshes.

A guard tries to do the same as the second admin example. The API rejects the first vehicle call with 403 (`ForbiddenException` from `VehiclesService.create`), the orchestrator marks the entry as `"error"`, and the parent UI does not progress. In practice the UI never gets here because the inline section returned `null` for the guard role.
