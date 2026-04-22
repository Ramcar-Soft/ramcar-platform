# Quickstart: Vehicle Brand & Model Autocomplete (Mexico Market)

**Feature**: 016-vehicle-brand-model-autocomplete
**Audience**: Engineers implementing the feature, reviewers, and anyone touching the vehicle form afterwards.

This is a how-to for wiring, extending, and testing the brand/model/year autocomplete that now powers the vehicle form in both `apps/web` and `apps/desktop`.

---

## The one-minute mental model

- The vehicle form still lives at `packages/features/src/shared/vehicle-form/vehicle-form.tsx` — the parent component that owns state and submits to `/api/vehicles`.
- The new autocompletes (`VehicleBrandSelect`, `VehicleModelSelect`) and the `VehicleYearInput` live under `packages/features/src/shared/vehicle-brand-model/` and are reused as-is by both apps via `@ramcar/features`.
- The dataset is a **static TS module** bundled with the client — no network, no API, no DB.
- Brand search is **fuzzy** (fuse.js). Model search is **startsWith / includes** (hand-rolled). Year is **optional** with Zod-validated bounds.
- When the user's typed brand or model isn't in the dataset, the suggestion list offers a **"Use '<typed text>'" fallback** row. Picking it commits the typed value verbatim.

---

## Package graph touch

```text
apps/web ──────┐
apps/desktop ──┼──▶ @ramcar/features/shared/vehicle-brand-model
               │        ├──▶ VEHICLE_BRAND_MODEL (static data)
               │        ├──▶ VehicleBrandSelect  (fuse.js fuzzy)
               │        ├──▶ VehicleModelSelect  (startsWith/includes)
               │        └──▶ VehicleYearInput    (numeric + Zod bounds)
               │
               └ Zod schema (@ramcar/shared) — `year` field added to createVehicleSchema
```

No app-local copies. If you find yourself creating `apps/*/src/features/vehicles/**`, stop — the feature lives in `@ramcar/features`.

---

## Task 1 — Add or remove a brand/model in the dataset

1. Open `packages/features/src/shared/vehicle-brand-model/data.ts`.
2. Add the new brand key (or append to an existing brand's model array). Canonical spelling = manufacturer Mexico-market marketing (e.g., "Volkswagen", not "VW"; "Mazda3", not "Mazda 3"). No trim suffix.
3. Run `pnpm --filter @ramcar/features test` — the invariants test (`data.test.ts`) enforces:
   - No duplicate brands or duplicate models within a brand (case-insensitive, diacritic-normalized).
   - Every brand has ≥1 model.
   - Names match the allowed character set (no stray whitespace, no empty strings).
   - Brand count stays within the sanity band (10–100).
4. Open a PR. Dataset changes are normal PRs.

**Removing a brand or model** requires an extra sentence in the PR description — historical vehicle rows may reference the removed string. They'll still render (the DB column is free-text), but their autocomplete round-trip breaks. Usually you want to leave entries in place.

---

## Task 2 — Wire the components into a new vehicle-like form

You shouldn't need to do this — the existing `VehicleForm` is the only consumer. If you do:

```tsx
import {
  VehicleBrandSelect,
  VehicleModelSelect,
  VehicleYearInput,
} from "@ramcar/features";

function MyForm() {
  const [brand, setBrand] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);

  return (
    <>
      <VehicleBrandSelect
        value={brand}
        onChange={(next) => {
          setBrand(next);
          // IMPORTANT: clear model when brand changes (FR-013)
          if (next !== brand) setModel(null);
        }}
      />
      <VehicleModelSelect
        brand={brand}       // drives enablement + scope
        value={model}
        onChange={setModel}
      />
      <VehicleYearInput value={year} onChange={setYear} />
    </>
  );
}
```

Two wiring rules (the components deliberately do not self-enforce them — the form owns the state):

- **Clear model when brand changes** — see the `onChange` body above.
- **Clear model when brand clears** — same handler: `if (next === null) setModel(null)`.

Both rules are tested at the parent `vehicle-form.test.tsx` level, not inside the primitives.

---

## Task 3 — Add i18n strings

All user-facing strings for this feature live under `vehicles.{brand, model, year}` in `@ramcar/i18n`. You should only need to touch this if:

- You add a new interaction (e.g., "clear selection" button with its own label).
- You add a new validation message.

Add keys to **both** `packages/i18n/src/messages/en.json` and `packages/i18n/src/messages/es.json`. Do NOT add per-app copies. The shared-features CI check (`pnpm check:shared-features`) will flag duplicates.

---

## Task 4 — Change the year bounds

Bounds live in two places — intentional, and the reason matters:

1. **`packages/shared/src/validators/vehicle.ts`** — the Zod schema. `min(1960)` and `max(currentYear() + 1)`. This is the authoritative bound. The factory function (`currentYear()`) means no redeploy is needed at year turnover.
2. **`supabase/migrations/*_add_year_to_vehicles.sql`** — the DB `CHECK` constraint. Deliberately looser: `year >= 1960 AND year <= 2100`. This is defense-in-depth against bad writes bypassing the API.

If you want to change bounds, edit the Zod schema only. Touching the DB `CHECK` means writing a new migration — not worth it unless policy demands.

---

## Task 5 — Run it locally

1. `pnpm install` — pick up `fuse.js` (new top-level dependency under `packages/features/package.json`).
2. `pnpm db:migrate:dev` — apply the `year` column migration to your local Supabase.
3. `pnpm db:types` — regenerate `@ramcar/db-types`.
4. `pnpm dev` — spin up the stack.
5. Navigate to the vehicle form (any place where it renders — residents catalog, visitors flow, service providers flow). Try:
   - Type "nis" in brand → Nissan appears.
   - Type "xyz" in brand → "Use 'xyz' as brand" fallback row.
   - Pick a brand → model field enables.
   - Pick a brand, then change it → model clears.
   - Type four digits in year → accepted. Type "abc" → blocked by the browser's `type="number"`.
6. Repeat in the desktop app (`pnpm --filter @ramcar/desktop dev`). All the same behaviors; additionally, disconnect the network and verify the autocomplete still renders and commits (dataset is bundled — no I/O).

---

## Task 6 — Run tests

| What | Command | Coverage |
|---|---|---|
| Shared feature unit tests | `pnpm --filter @ramcar/features test` | data invariants, search, brand/model/year components |
| Shared Zod schema tests | `pnpm --filter @ramcar/shared test` | `createVehicleSchema` with `year` bounds |
| API integration | `pnpm --filter @ramcar/api test` | `POST /api/vehicles` accepts/rejects `year` per the schema |
| Web E2E | `pnpm --filter @ramcar/web test:e2e -- --grep="vehicle"` | full flow, network-free assertion, keyboard-only flow |
| Desktop integration | `pnpm --filter @ramcar/desktop test` | offline flow |
| Microbenchmark | `pnpm --filter @ramcar/features test -- --grep="bench"` | asserts p95 brand search <50 ms (SC-003) |

---

## Task 7 — Debug a bad suggestion

If a user reports "I typed X and the wrong brand came up," do this:

1. Reproduce in the brand component's Storybook / test harness.
2. Check the typed string through `normalizeForSearch` in `search.ts`. Mojibake (e.g., pasted smart quotes) is the most common surprise.
3. Check the `fuse.js` threshold — we ship at `0.3`. If this needs tuning, land the change with benchmark data and a test that locks in the new expected match set.
4. Check whether the user's query is actually absent from the dataset (a free-text fallback might be the correct answer).

If a user reports "I typed X under brand Nissan and got nothing," the model list is likely missing the entry. Add to `data.ts` (Task 1).

---

## Gotchas we already hit

- **Don't coerce year strings.** The Zod schema uses `z.number().int()` — not `z.coerce.number()`. The form is responsible for string→number conversion. If you ever find yourself adding `.coerce`, you're papering over a form-layer bug and the validation gets murkier.
- **Don't add the dataset to `@ramcar/shared`.** It's UI-tier reference data; keeping it with the UI components preserves the vertical-slice layout of `@ramcar/features`.
- **Don't re-introduce a runtime fetch.** If a future scenario ever needs per-tenant brand/model overrides, model that as a separate tenant-config flow on top of — not inside — this dataset. FR-017 is a spec-level hard rule (SC-004 asserts zero fetches).
- **Don't wrap `VEHICLE_BRAND_MODEL` in a hook.** It's a module-scope constant (frozen). No React state, no context. Treat it like a lookup table; pass it through closure where needed.
