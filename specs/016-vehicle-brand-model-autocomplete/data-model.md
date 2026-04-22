# Phase 1 — Data Model: Vehicle Brand & Model Autocomplete (Mexico Market)

**Feature**: 016-vehicle-brand-model-autocomplete
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)
**Research**: [research.md](./research.md)
**Date**: 2026-04-21

This document defines the data entities affected or introduced by the feature and their validation rules. There are three: a **static reference dataset** (new, bundled in the client), the **vehicles table** (existing, one new column), and the **create-vehicle input** (existing schema, extended with one optional field). No new API entity is introduced.

---

## 1. `VehicleBrandModel` dataset entry (NEW — static reference data, no DB)

The dataset is the single source of truth for "what brand/model pairs does the Mexico market support for autocomplete." It lives in `packages/features/src/shared/vehicle-brand-model/data.ts` as a frozen TypeScript constant. It is NOT a database table, NOT an API endpoint, NOT a file fetched at runtime.

### Shape

```ts
// packages/features/src/shared/vehicle-brand-model/data.ts

/**
 * Brand → list of models for the Mexico market.
 * Curated by hand from AMDA / INEGI / manufacturer Mexico sites.
 * Canonical spelling matches manufacturer marketing.
 *
 * Mutation policy: append-only during normal PRs. Removals require sign-off
 * because historical vehicle rows may still reference a removed model.
 */
export const VEHICLE_BRAND_MODEL: Readonly<Record<string, readonly string[]>> = Object.freeze({
  Nissan: ["Versa", "Sentra", "March", "Kicks", "X-Trail", "NP300", "Frontier", /* … */],
  Chevrolet: ["Aveo", "Onix", "Cavalier", "Spark", "Trax", "Tracker", /* … */],
  Volkswagen: ["Jetta", "Vento", "Polo", "Virtus", "Tiguan", "Teramont", /* … */],
  Toyota: ["Corolla", "Yaris", "Hilux", "Tacoma", "RAV4", "Highlander", /* … */],
  Kia: ["Rio", "Forte", "K3", "Sportage", "Sorento", "Seltos", /* … */],
  Mazda: ["Mazda2", "Mazda3", "CX-3", "CX-30", "CX-5", "CX-50", "CX-9", /* … */],
  Hyundai: ["Accent", "Elantra", "Creta", "Tucson", "Santa Fe", "Grand i10", /* … */],
  Honda: ["City", "Civic", "HR-V", "CR-V", "Pilot", /* … */],
  Ford: ["Figo", "Fiesta", "EcoSport", "Escape", "Edge", "Mustang", "Ranger", "F-150", /* … */],
  Renault: ["Kwid", "Stepway", "Duster", "Oroch", "Koleos", /* … */],
  // … ~25–35 brands total
});

export type VehicleBrand = keyof typeof VEHICLE_BRAND_MODEL;
```

### Fields

| Field | Type | Notes |
|---|---|---|
| `<brand>` (key) | `string` | Canonical brand marketing spelling ("Volkswagen", not "VW"). |
| `<brand>.<models>` (value) | `readonly string[]` | Non-empty list of canonical model names for that brand. Must not contain duplicates (case-insensitive). |

### Invariants (enforced by `data.test.ts`)

- **I-D1**: No duplicate brand keys (TypeScript object-literal already enforces; a test makes the intent explicit).
- **I-D2**: Every brand's model list is non-empty.
- **I-D3**: Within a single brand, models are unique after case-insensitive, diacritic-normalized comparison.
- **I-D4**: Every brand name and model name matches `^[A-Za-z0-9][A-Za-z0-9 \-\.]*$` — no leading/trailing whitespace, no empty strings, no unicode surprises that would break diacritic normalization at search time.
- **I-D5**: Brand count is inside a sanity band of 10–100. Tripwire: fail the test if someone deletes half the dataset by accident.
- **I-D6**: `Object.isFrozen(VEHICLE_BRAND_MODEL)` returns `true`. Consumers must not mutate.

### Rationale

This is reference data, not domain data. It does not vary per tenant, per user, or per request. Keeping it out of Postgres:

- Eliminates a round-trip for an autocomplete that must render in <50 ms (spec SC-003).
- Removes a network path that would break offline for the desktop guard booth (Principle IV).
- Makes updates reviewable via git rather than via an ad-hoc admin tool.

### Versioning

The dataset evolves by normal PRs. No explicit version field is introduced — the source control history (git blame on `data.ts`) is the version log. If downstream analysis ever needs to know "when did we add brand X," the commit that added it is authoritative.

---

## 2. `vehicles` table (EXISTING — one new column)

The `public.vehicles` table already exists (created in migration `20260410000000_create_vehicles_and_access_events.sql`). This feature adds **one nullable column** and a matching `CHECK` constraint. No other schema change.

### Full post-migration column list (for context)

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `uuid` | NO | Primary key, `default gen_random_uuid()`. Unchanged. |
| `tenant_id` | `uuid` | NO | FK to `public.tenants(id)`. Unchanged. RLS scoped by this column. |
| `user_id` | `uuid` | YES | FK to `public.profiles(id)`. Unchanged. Exactly one of (`user_id`, `visit_person_id`) is set (via existing `chk_vehicle_owner`). |
| `visit_person_id` | `uuid` | YES | FK to `public.visit_persons(id)`. Unchanged. |
| `vehicle_type` | `varchar(20)` | NO | Enum-checked to `{car, motorcycle, pickup_truck, truck, bicycle, scooter, other}`. Unchanged. |
| `brand` | `varchar(100)` | YES | Unchanged at DB level. The autocomplete sends canonical dataset value when available, free-text when fallback used. |
| `model` | `varchar(100)` | YES | Unchanged at DB level. Same semantics as `brand`. |
| `plate` | `varchar(20)` | YES | Unchanged. |
| `color` | `varchar(50)` | YES | Unchanged. |
| `notes` | `text` | YES | Unchanged. |
| **`year`** | **`smallint`** | **YES** | **NEW**. Four-digit year of manufacture. `NULL` when unknown. |
| `is_blacklisted` | `boolean` | NO | Default `false`. Unchanged. |
| `blacklist_scope` | `varchar(10)` | YES | Unchanged. |
| `blacklist_reason` | `text` | YES | Unchanged. |
| `created_at` | `timestamptz` | NO | Default `now()`. Unchanged. |
| `updated_at` | `timestamptz` | NO | Default `now()`, updated via trigger. Unchanged. |

### New column specification

```sql
ALTER TABLE public.vehicles
  ADD COLUMN year smallint;

ALTER TABLE public.vehicles
  ADD CONSTRAINT chk_vehicles_year
    CHECK (year IS NULL OR (year >= 1960 AND year <= 2100));
```

### Notes on the new column

- **Type `smallint`** — 2 bytes, range ±32,767. Four-digit years fit trivially and at half the cost of `integer`.
- **Nullable** — `year` is explicitly optional per spec FR-011. Existing rows will have `NULL`, which correctly encodes "year was never recorded."
- **CHECK bounds (1960 … 2100)** — defense-in-depth against bad writes bypassing the API. The authoritative bound is the Zod schema (`currentYear() + 1`), which tightens over time; the DB bound is deliberately loose (2100) so it never needs to be migrated again in our lifetime.
- **No new index** — `year` is not searched or sorted on its own; it's a display field. Adding an index is premature optimization.
- **RLS unchanged** — the existing per-tenant RLS policy on `vehicles` fully covers the new column.

### Migration

File: `supabase/migrations/{timestamp}_add_year_to_vehicles.sql`

```sql
-- Migration: add_year_to_vehicles
-- Adds optional year column to vehicles for the brand/model/year autocomplete.

ALTER TABLE public.vehicles
  ADD COLUMN year smallint;

ALTER TABLE public.vehicles
  ADD CONSTRAINT chk_vehicles_year
    CHECK (year IS NULL OR (year >= 1960 AND year <= 2100));

COMMENT ON COLUMN public.vehicles.year IS
  'Four-digit year of manufacture. Optional. Authoritative bounds enforced by Zod schema in @ramcar/shared.';
```

Follow-up: `pnpm db:types` regenerates `@ramcar/db-types` so the new column appears in generated types.

---

## 3. `CreateVehicleInput` (EXISTING Zod schema — extended with `year`)

Defined at `packages/shared/src/validators/vehicle.ts`. The schema is currently a Zod discriminated union on `ownerType` (`"user"` | `"visitPerson"`). Both branches share a `vehicleFields` object; `year` is added to that shared object so both branches pick it up automatically.

### Before (current)

```ts
const vehicleFields = {
  vehicleType: vehicleTypeEnum,
  brand: z.string().max(100).optional().or(z.literal("")),
  model: z.string().max(100).optional().or(z.literal("")),
  plate: z.string().max(20).optional().or(z.literal("")),
  color: z.string().max(50).optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
};
```

### After (this feature)

```ts
const currentYear = () => new Date().getFullYear();

const vehicleFields = {
  vehicleType: vehicleTypeEnum,
  brand: z.string().max(100).optional().or(z.literal("")),
  model: z.string().max(100).optional().or(z.literal("")),
  plate: z.string().max(20).optional().or(z.literal("")),
  color: z.string().max(50).optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  year: z
    .number()
    .int()
    .min(1960, "Year must be 1960 or later")
    .max(currentYear() + 1, "Year cannot be in the future beyond next model year")
    .optional(),
};
```

### Validation rules for `year`

| Rule | Behavior |
|---|---|
| Type | Must be a number (Zod coerces only if `.coerce.number()` is used — we do NOT coerce; the form explicitly converts string → number or leaves it `undefined`). |
| Integer | `.int()` rejects `2019.5`. |
| Lower bound | `>= 1960`. Matches research §5. |
| Upper bound | `<= currentYear() + 1`. Bounds tighten with calendar time. |
| Optional | `.optional()` — `undefined` is valid. |
| Empty string from form | Converted to `undefined` by the form adapter BEFORE `safeParse` — see §4 below. |

### Rationale

- Single schema per Principle V. The NestJS Zod validation pipe and the shared form both consume `createVehicleSchema`; no duplication.
- `currentYear()` factory is cheap and gives calendar-correct bounds without redeployment. Tests can seed a fixed "now" via Vitest's `vi.setSystemTime()` to assert the bound behavior deterministically.
- `.optional()` without `.nullable()` — the client emits `undefined` for "empty," matching how other vehicle fields work (`brand`, `model`, etc. use `.optional().or(z.literal(""))`). For `year` we don't accept `""` because the form passes `undefined` directly, not an empty string.

---

## 4. `Vehicle` response type (EXISTING — extended with `year`)

`packages/shared/src/types/vehicle.ts` currently declares:

```ts
export interface Vehicle {
  id: string;
  tenantId: string;
  userId: string | null;
  visitPersonId: string | null;
  vehicleType: VehicleType;
  brand: string | null;
  model: string | null;
  plate: string | null;
  color: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
```

Add one field:

```ts
export interface Vehicle {
  // … unchanged fields …
  year: number | null;      // NEW
  // … unchanged fields …
}
```

The repository at `apps/api/src/modules/vehicles/vehicles.repository.ts` must be updated to:

- Insert `year: dto.year ?? null` on create.
- Select `year` back with existing columns (explicit column list or keep `select()` bare — which currently returns all columns).
- Map the DB snake-case `year` (no snake→camel conversion needed since `year` is one word) to the interface's `year` on read. No repository code change is needed beyond rebuilding types from the regenerated `@ramcar/db-types`.

---

## 5. Transport payload (form → API)

The shared `VehicleForm` today posts to `/vehicles` with a body shaped by `createVehicleSchema`. With this feature the body gains `year`:

```jsonc
// POST /api/vehicles
{
  "ownerType": "user",
  "userId": "…uuid…",
  "vehicleType": "car",
  "brand": "Nissan",
  "model": "Versa",
  "plate": "ABC-123",
  "color": "#FF0000",
  "notes": "Primary car",
  "year": 2019                  // NEW — omitted if user left it blank
}
```

- The **transport port** (web's `apiClient`, desktop's outbox-aware adapter) is unchanged at the contract level; it still accepts `CreateVehicleInput` and serializes it.
- The **desktop outbox** is unchanged — it stores the whole payload object and replays it. The `year` field rides along transparently.

No changes to `access-events` payloads, `visit-persons` payloads, or image-upload payloads — the feature only touches the vehicle-create flow.

---

## 6. State transitions

### Brand component

| From | Event | To | Effect |
|---|---|---|---|
| `brand = null` | User types in brand input | (unchanged, input has typed text) | Suggestion list opens; `Fuse` filters `VEHICLE_BRAND_MODEL` keys. |
| suggestion list open | User presses Enter on a dataset item | `brand = <canonical>` | `onChange(brand)` fires; focus moves to model input. |
| suggestion list open | User presses Enter on the `Use "…"` item | `brand = <typed text, trimmed>` | `onChange(brand)` fires; model input enables as free text. |
| suggestion list open | User presses Escape | `brand` unchanged | List closes; prior committed value preserved. |
| `brand = <anything>` | User empties the brand input | `brand = null` | `onChange(null)` fires; model clears and disables. |

### Model component

| From | Event | To | Effect |
|---|---|---|---|
| `brand = null` | — | model input disabled | No interaction possible. |
| `brand = <canonical>` | User types in model input | (unchanged, input has typed text) | Suggestion list filters `VEHICLE_BRAND_MODEL[brand]` via startsWith/includes. |
| `brand = <free-text>` | User types in model input | (unchanged) | No dataset list — accepts typed value through the `Use "…"` fallback row only (no canonical matches possible). |
| suggestion open | User picks a model item | `model = <canonical>` | `onChange(model)` fires. |
| suggestion open | User picks `Use "…"` | `model = <typed>` | `onChange(model)` fires. |
| `brand` changes to a different value | — | `model = null` | Parent form must clear model on brand change (enforced in `VehicleForm`'s wrapper logic). |

### Year input

| From | Event | To | Effect |
|---|---|---|---|
| `year = null` | User types "2019" | `year = 2019` | `onChange(2019)`; validation passes on submit. |
| `year = 2019` | User clears input | `year = null` | `onChange(null)`; submit still valid (year optional). |
| `year = null` | User types "abc" | `year = null` (but input shows "abc") | Submit blocked with `year.invalid` message. `type="number"` also strips in modern browsers. |
| `year = null` | User types "1800" | `year = 1800` held in input | Submit blocked: below lower bound 1960. |

---

## 7. Cross-feature impact

| Consumer | Change |
|---|---|
| `packages/features/src/shared/vehicle-form/vehicle-form.tsx` | Replace plain `<Input>` for brand/model with `<VehicleBrandSelect>` + `<VehicleModelSelect>`. Add `<VehicleYearInput>`. Extend local state with `year: number | null`. Extend `initialDraft` and `onDraftChange` with `year`. |
| `apps/api/src/modules/vehicles/vehicles.repository.ts` | Insert `year` on create. No change to reads beyond returning the new column. |
| `apps/api/src/modules/vehicles/dto/create-vehicle.dto.ts` | Re-export the same shared schema — automatically picks up `year`. Zero code change. |
| `apps/web/src/features/residents/` (draft persistence) | Draft shape includes `year`. The existing `useFormPersistence` serializes unknown-shape drafts as-is; no change required beyond updating the local `useState` initial value. |
| `apps/desktop/electron/services/sync-engine.ts` (if present) | None. Payload is passed opaquely through outbox; `year` is a field inside the existing vehicle-create payload, not a new operation kind. |
| `@ramcar/db-types` | Regenerated via `pnpm db:types` — introduces `year: number | null` on the `vehicles` row type. No manual edit (Principle VII). |
| `@ramcar/i18n` | New keys under `vehicles.brand.{searchPlaceholder, noResults, addCustom, ariaLabel}`, `vehicles.model.{disabled, noResults, addCustom, ariaLabel}`, and `vehicles.year.{label, placeholder, invalid, ariaLabel}`. Existing `vehicles.brand.label`, `vehicles.brand.placeholder`, `vehicles.model.label`, `vehicles.model.placeholder` unchanged. |

---

## 8. Not a data entity

For completeness — the following are deliberately NOT modeled:

- **Vehicle year history**. We store the single nominal manufacture year; we do not model "year the owner acquired the car," "year last inspected," etc. (FR-010, non-goal list in spec).
- **Trim / variant**. Non-goal in spec.
- **VIN / unique vehicle identifier**. Non-goal.
- **Dataset version / release metadata**. Git history is the version log.
- **Per-tenant brand/model allow-list**. Out of scope — the dataset is global for Mexico.
