# Contracts — Inline Vehicle Creation

This feature does NOT introduce or modify any HTTP/API contract. The existing `POST /api/vehicles`, `POST /api/users`, and `POST /api/visit-persons` endpoints are reused verbatim. This file ratifies the unchanged endpoint contracts and documents the new INTERNAL UI prop contracts that the shared module exposes to host apps.

---

## 1. Reused HTTP contracts (unchanged)

### POST /api/vehicles

**Auth**: `JwtAuthGuard + RolesGuard` — any authenticated role may attempt; `VehiclesService.create` enforces:

- `dto.ownerType === "user" && role === "guard"` → `403 ForbiddenException` (FR-008 enforcement point — DO NOT REMOVE).
- All other combinations are accepted.

**Request body** (Zod-validated by `createVehicleSchema`):

```ts
// Discriminated on ownerType:
{ ownerType: "user", userId: string (uuid), vehicleType, brand?, model?, plate?, color?, notes?, year? }
| { ownerType: "visitPerson", visitPersonId: string (uuid), vehicleType, brand?, model?, plate?, color?, notes?, year? }
```

**Response**: `Vehicle` row.

**Errors observed by the orchestrator**:

- `403` — guard tried to write a resident-owned vehicle. Mapped to a per-row error with the localized "forbidden" message.
- `409` (or whatever the existing plate-uniqueness error code is — see `apps/api/src/modules/vehicles/`) — plate conflict. Mapped to a field-level error against the row's `plate` field.
- `400` — Zod validation failed. Mapped to field-level errors against the offending fields.
- `5xx` — generic server error. Mapped to a row-level "Try again" badge.

This contract is **stable**. No new endpoints, no new fields, no new error codes are introduced by this spec.

### POST /api/users (resident creation)

Used by the host (`apps/web/src/features/users/hooks/use-create-user.ts`) to create the resident before the orchestrator runs. Unchanged from spec 020 / 008.

### POST /api/visit-persons (visitor + provider creation)

Used by the host (`packages/features/src/visitors/hooks/use-create-visit-person.ts`) to create the visitor or provider before the orchestrator runs. Unchanged from spec 011.

---

## 2. New UI contracts (internal — not HTTP)

### `<InlineVehicleSection />`

```ts
type OwnerKind = "resident" | "visitPerson";

interface InlineVehicleSectionProps {
  /** Disambiguates which API surface every saved row will be POSTed to,
   *  and drives the role gate (guard sees null when ownerKind === "resident"). */
  ownerKind: OwnerKind;

  /** Controlled state — the host owns the entries array via the orchestrator
   *  hook. The section is presentation only. */
  entries: InlineVehicleEntry[];
  onAddEntry: () => void;
  onRemoveEntry: (clientId: string) => void;
  onUpdateEntry: (clientId: string, patch: Partial<InlineVehicleEntryFields>) => void;

  /** Disable add/remove/edit while the parent submit is in flight. */
  disabled?: boolean;

  /** Optional override of the section header copy. Defaults to
   *  vehicles.inline.sectionTitle (or sectionTitleResident when
   *  ownerKind === "resident"). */
  sectionTitleKey?: string;
}
```

**Behavior contract**:

- When `ownerKind === "resident"` AND `useRole().role === "guard"`, the component returns `null`. No header, no rows, no add button. (FR-008.)
- When `entries.length === 0` and the section is rendered, only the "Add vehicle" button is visible. There is no preallocated empty row.
- Each row renders the same field set as `VehicleForm` (vehicleType, brand, model, plate, color, year, notes) by composing the existing field components.
- Each row's right-hand side renders one of: a remove button (status `"draft"` or `"error"`), a "Saving…" spinner (status `"saving"`), or a "Saved" pill with the plate text (status `"saved"`).
- Field-level errors from `entry.fieldErrors` render under the offending input.
- A row-level error from `entry.errorMessage` renders as a destructive-toned banner above the row's fields.

**i18n contract**: All text is rendered through the `useI18n()` adapter. The component MUST NOT import `next-intl` or `react-i18next` directly.

**Role contract**: The component reads the actor role through the `useRole()` adapter. It MUST NOT read from a host-app-specific store (e.g., `useAppStore` from `@ramcar/store` is forbidden inside the shared module).

### `useInlineVehicleSubmissions(initialEntries?)`

```ts
function useInlineVehicleSubmissions(
  initialEntries?: InlineVehicleEntryFields[],
): {
  entries: InlineVehicleEntry[];
  isSubmittingAny: boolean;
  allSaved: boolean;

  addEntry(): void;
  removeEntry(clientId: string): void;
  updateEntry(clientId: string, patch: Partial<InlineVehicleEntryFields>): void;
  reset(): void;

  /** Iterates entries with status "draft" or "error" and submits each
   *  through POST /api/vehicles in sequence. Resolves with the final
   *  partition. */
  submitAll(
    personId: string,
    ownerKind: "resident" | "visitPerson",
  ): Promise<{ saved: InlineVehicleEntry[]; failed: InlineVehicleEntry[] }>;
};
```

**Behavior contract**:

- `submitAll` MUST NOT be called concurrently. The hook throws a developer-mode error if the second call arrives while `isSubmittingAny` is true.
- `submitAll` MUST be idempotent on already-`"saved"` rows: those are skipped (the `vehicleId` is preserved).
- The hook tags each fired request with the existing TanStack Query mutation pattern used by `VehicleForm`'s create call, including the `["vehicles", tenantId, ownerKind, ownerId]` cache invalidation.
- Validation per row is delegated to `createVehicleSchema.safeParse` — the hook MUST NOT introduce a separate per-field validator.
- A row whose `vehicleType` is empty or whose `safeParse` fails is NOT submitted; it stays in `"draft"` status with `fieldErrors` populated from the Zod issues.

**Error mapping contract**:

| HTTP status | New entry status | `errorMessage` source | `fieldErrors` source |
|-------------|------------------|-----------------------|----------------------|
| 2xx         | `"saved"`        | (cleared)             | (cleared)            |
| 400         | `"draft"`        | (cleared)             | derived from Zod issues / API field-error envelope |
| 403         | `"error"`        | `vehicles.messages.forbidden` | (cleared) |
| 409         | `"error"`        | `vehicles.inline.errorPlateInUse` | `{ plate: "…" }` |
| 5xx / network | `"error"`     | `vehicles.messages.errorCreating` | (cleared) |

The exact mapping for 400 vs. 409 follows the existing `VehicleForm` error handling (`packages/features/src/shared/vehicle-form/vehicle-form.tsx:185-194`); the spec does not introduce new error codes.

---

## 3. Host app integration contract

A host that mounts `<InlineVehicleSection />` MUST:

1. Own the `useInlineVehicleSubmissions` hook at the level that owns the parent form state (i.e., the form component itself or its sidebar wrapper).
2. After a successful person-create call, pass the new `personId` to `submitAll`.
3. After `submitAll` resolves with `failed.length === 0`, perform whatever post-success transition the host wants (close sidebar, switch to access-event step, etc.).
4. After `submitAll` resolves with `failed.length > 0`, KEEP the sidebar open. Do NOT reset the orchestrator. Do NOT delete the person. The orchestrator's `personId` is intact for retry.
5. On sidebar close, call `orchestrator.reset()` and discard the form.

Hosts MUST NOT:

- Re-implement the per-row submit loop.
- Call `POST /api/vehicles` directly for inline rows (only the orchestrator does).
- Read or write `entry.vehicleId` outside the orchestrator's API.
- Persist `entry.status` / `entry.errorMessage` / `entry.fieldErrors` to localStorage (only `InlineVehicleEntryFields` is allowed in the persisted snapshot).

---

## 4. What is explicitly NOT a contract change

- The Zod schemas in `@ramcar/shared` are unchanged (Constitution Principle V).
- The NestJS controllers and services are unchanged.
- The TanStack Query key shape `["vehicles", tenantId, ownerKind, ownerId]` is unchanged.
- The desktop SQLite outbox is untouched.
- The `shared-features.json` manifest does not need a new entry (the section is added to an existing shared primitive, `vehicle-form`).
