# API contract — `year` field extension for `/api/vehicles`

**Scope**: The existing `POST /api/vehicles` endpoint accepts one new optional field (`year`). The `Vehicle` response type gains one new field (`year`). No new endpoint is added. No existing endpoint URL or verb changes.

---

## POST /api/vehicles

**Authorization**: Unchanged. JWT (TenantGuard) + RolesGuard for `super_admin`, `admin`, `guard`.

### Request body

Existing discriminated union on `ownerType`. The new `year` field belongs to the shared `vehicleFields` and is therefore valid in both branches.

```jsonc
// Resident-owned vehicle
{
  "ownerType": "user",
  "userId": "11111111-1111-1111-1111-111111111111",
  "vehicleType": "car",
  "brand": "Nissan",            // canonical from dataset or free-text fallback
  "model": "Versa",             // canonical from dataset or free-text fallback
  "plate": "ABC-123",           // optional
  "color": "#FF0000",           // optional
  "notes": "Primary car",       // optional
  "year": 2019                  // NEW — optional; integer in [1960, currentYear()+1]; omit for unknown
}

// Visitor-owned vehicle
{
  "ownerType": "visitPerson",
  "visitPersonId": "22222222-2222-2222-2222-222222222222",
  "vehicleType": "car",
  "brand": "Volkswagen",
  "model": "Jetta",
  "year": 2022
}
```

### Validation

The NestJS Zod validation pipe applies `createVehicleSchema` from `@ramcar/shared`. After this feature ships:

```ts
// @ramcar/shared — packages/shared/src/validators/vehicle.ts
year: z
  .number()
  .int()
  .min(1960, "Year must be 1960 or later")
  .max(currentYear() + 1, "Year cannot be in the future beyond next model year")
  .optional()
```

- Missing `year` is VALID (optional).
- `"2019"` (string) is REJECTED (we do not `.coerce.number()` — the form converts).
- `2019.5` is REJECTED (`.int()`).
- `1959` is REJECTED (below lower bound).
- `2100` is REJECTED (above `currentYear + 1` at time of evaluation).

### Success response (201)

```jsonc
{
  "id": "33333333-3333-3333-3333-333333333333",
  "tenantId": "44444444-4444-4444-4444-444444444444",
  "userId": "11111111-1111-1111-1111-111111111111",
  "visitPersonId": null,
  "vehicleType": "car",
  "brand": "Nissan",
  "model": "Versa",
  "plate": "ABC-123",
  "color": "#FF0000",
  "notes": "Primary car",
  "year": 2019,                // NEW — integer or null
  "isBlacklisted": false,
  "blacklistScope": null,
  "blacklistReason": null,
  "createdAt": "2026-04-21T12:34:56.789Z",
  "updatedAt": "2026-04-21T12:34:56.789Z"
}
```

### Error responses

Unchanged from today in shape (ZodError → 400, missing/invalid JWT → 401, cross-tenant user → 403). Only new validation message: `"Year must be 1960 or later"` / `"Year cannot be in the future beyond next model year"` surface under the `year` field path.

---

## GET /api/vehicles?userId=… (existing)

Response element shape gains `year: number | null`. No parameter change.

## GET /api/vehicles?visitPersonId=… (existing)

Same — response element shape gains `year: number | null`.

---

## Repository-level changes

`apps/api/src/modules/vehicles/vehicles.repository.ts`:

- `create()` — insert `year: dto.year ?? null` alongside the other columns.
- `findByUserId()` / `findByVisitPersonId()` — bare `.select()` already returns all columns, including the new `year`. No code change needed beyond regenerating `@ramcar/db-types`.

---

## DB migration

See `data-model.md` §2. New migration file:
`supabase/migrations/{timestamp}_add_year_to_vehicles.sql`

```sql
ALTER TABLE public.vehicles
  ADD COLUMN year smallint;

ALTER TABLE public.vehicles
  ADD CONSTRAINT chk_vehicles_year
    CHECK (year IS NULL OR (year >= 1960 AND year <= 2100));

COMMENT ON COLUMN public.vehicles.year IS
  'Four-digit year of manufacture. Optional. Authoritative bounds enforced by Zod schema in @ramcar/shared.';
```

Run post-migration: `pnpm db:types` to regenerate `@ramcar/db-types`.

---

## Non-changes

- No new endpoint. No URL changes.
- No RLS policy change. The existing per-tenant policy on `vehicles` covers the new column.
- No change to the desktop outbox payload shape beyond the new field inside the existing vehicle-create operation.
- No change to the `access_events`, `visit_persons`, or `profiles` tables.
- No change to `@ramcar/i18n` API — only new message keys under `vehicles.{brand, model, year}`.
