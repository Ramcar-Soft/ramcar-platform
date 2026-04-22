# Phase 0 — Research: Vehicle Brand & Model Autocomplete (Mexico Market)

**Feature**: 016-vehicle-brand-model-autocomplete
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)
**Date**: 2026-04-21

This file resolves the open questions raised while filling the Technical Context in `plan.md`. Each entry records the decision, the rationale, and the alternatives considered. The spec commits to the feature's coverage target (≥90% for Mexico), UX contract (fuzzy brand, `startsWith`/`includes` model, free-text fallback, keyboard navigation, <50 ms suggestions, no runtime network), and placement (`@ramcar/features`). Research below decides the implementation-level unknowns.

---

## 1. Fuzzy-search library for brand input

**Decision**: Use `fuse.js` (existing ecosystem standard, small, dependency-free) for the **brand** input only. The brand dataset is small (≤50 entries for the Mexico top-brand set), so a pre-built `Fuse` index is cheap to construct once at module load (`useMemo` guarded by a stable dataset reference). Model search does NOT use `fuse.js` per the spec (FR-005) — it uses a custom `normalize + startsWith-or-includes + rank` function.

- Brand `Fuse` config:
  - `keys: ["name"]` (single-key search)
  - `threshold: 0.3` (balanced — catches minor typos without false positives on unrelated brands)
  - `ignoreLocation: true` (we want "agen" to match "Volkswagen")
  - `includeScore: true` (used only to sort; not surfaced in the UI)
  - `minMatchCharLength: 2` (avoid single-char firehose)
- Model search (hand-rolled):
  - Normalize query and each model name (lowercase, strip diacritics via NFD + regex) once per brand at memo time.
  - Rank: `startsWith` (score 0) > `includes` (score 1) — stable within each rank by dataset index (dataset order is editor-curated alphabetical).
  - Cap at 10 results (FR-006).

**Rationale**:
- `fuse.js` is ~8 KB gzipped, zero dependencies, and battle-tested — adequate for the brand's ≤50-item list. Building the index at first mount is well under 50 ms on a reviewer laptop (it's a list scan + tokenization over a tiny array).
- A small, curated brand list does not need the larger `match-sorter` abstraction. `match-sorter` is powerful but leans into sorting over arbitrary object keys, which we don't need here.
- Keeping the model search hand-rolled is explicit in the spec (FR-005). This also avoids any fuzzy bleed-through when a user types "Cor" and happens to land near a fuzzy-adjacent unrelated model.

**Alternatives considered**:
- **`match-sorter`**: more expressive but heavier and more general than we need. Rejected — the brand list is tiny and model search is deliberately not fuzzy.
- **No library at all (hand-rolled trigram or Levenshtein)**: rejected — reinventing fuzzy-ranking for no benefit, and any bug lives forever in our code rather than upstream.
- **Using `cmdk`'s built-in filter via `CommandInput`**: the existing `ColorSelect` (packages/features/src/shared/color-select/color-select.tsx:273) already uses `cmdk`'s `Command` primitive with a custom `filter={(itemValue, searchTerm) => …}` — we adopt the same pattern for the brand input but delegate the match decision to `fuse.js` so matching is typo-tolerant. For the model input we keep `cmdk` and plug in the hand-rolled startsWith/includes matcher.

---

## 2. Dataset source, shape, and curation process

**Decision**: Author the dataset as a TypeScript module under `packages/features/src/shared/vehicle-brand-model/data.ts` exporting a frozen object with the shape the spec requires:

```ts
export const VEHICLE_BRAND_MODEL: Readonly<Record<string, readonly string[]>> = Object.freeze({
  Nissan: ["Versa", "Sentra", "March", "Kicks", "X-Trail", "NP300", "Frontier", /* … */],
  Chevrolet: ["Aveo", "Onix", "Cavalier", "Spark", "Trax", "Tracker", "Captiva", /* … */],
  Volkswagen: ["Jetta", "Vento", "Polo", "Virtus", "Tiguan", "Teramont", /* … */],
  // …
});
```

The dataset is hand-curated from public Mexico-market references: INEGI vehicle registration aggregates (public statistics), AMDA (Asociación Mexicana de Distribuidores de Automotores) top-selling-brand lists, and the manufacturer websites' Mexico-specific model lineups (e.g., VW México, Nissan México). The initial scope targets ~25–35 brands × avg 10–20 models ≈ 300–700 model entries — comfortably inside the spec's 1,000–2,500 envelope and well under 50 KB on disk. No license concerns: brand/model names are factual labels, not copyrightable content.

The canonical brand spelling matches manufacturer marketing (e.g., "Volkswagen" not "VW", "Mercedes-Benz" not "Mercedes", "BMW" as-is). Model spellings match Mexico-market marketing (e.g., "Jetta" — not "Jetta GLI" which is a trim — per the non-goal "trim-level granularity").

**Rationale**:
- `.ts` (not `.json`) lets us use `Object.freeze`, typedoc comments on the const, and a `type VehicleBrand = keyof typeof VEHICLE_BRAND_MODEL` if we want narrow brand typings. It also tree-shakes cleanly in both Vite (desktop) and the Next.js webpack bundle (web).
- A single file keeps edits atomic and reviewable. One PR per dataset revision. No CMS, no DB table, no runtime fetch (FR-017, FR-022).
- Sibling `data.test.ts` verifies invariants:
  1. No duplicate brands.
  2. Within each brand, no duplicate model names (case-insensitive).
  3. Every brand has ≥1 model.
  4. All strings match `^[A-Za-z0-9][A-Za-z0-9 \-\.]*$` (no stray whitespace, no empty entries, no unexpected unicode that would break diacritic normalization).
  5. Brand count is inside a sanity band (e.g., 10–100) — tripwire for accidental deletion.

**Alternatives considered**:
- **`.json` file**: loses the typedoc/type narrowing and requires a small loader. Rejected — no upside vs. `.ts`.
- **Generated at build time from a CSV**: rejected — adds a build step and a second source-of-truth file. The raw TS is the simplest source of truth.
- **Pulled from an open dataset (e.g., NHTSA vPIC)**: rejected — that dataset is US-market, noisy (thousands of models and trims), and requires runtime fetch or a large mirror. Curation against Mexico-market marketing beats bulk-import.
- **Stored in Postgres and exposed via an API endpoint**: rejected — violates FR-017 (no runtime network), adds complexity with no benefit (the data is read-only reference data, not per-tenant).

---

## 3. Diacritic and case normalization

**Decision**: Use `String.prototype.normalize("NFD").replace(/[̀-ͯ]/g, "")` + `.toLowerCase()` + `.trim()` in a single helper `normalizeForSearch(input: string): string` colocated with the component. Apply it to both the user query and each candidate (brand names and model names) at memo build time. Never normalize the canonical stored value — the dataset spelling is what we persist.

**Rationale**:
- Mexico market — users will type "peugeot", "Peugeot", "PEUGEOT", "peugeót". Diacritic-agnostic, case-agnostic matching is the minimum acceptable UX.
- NFD + combining-mark strip is the zero-dependency standard approach, matches what `packages/features/src/shared/color-select/color-lookup.ts` already does internally, and needs no lib.
- Stored values stay in dataset canonical form (FR-012) — normalization is a matching concern only.

**Alternatives considered**:
- `Intl.Collator` with `{ sensitivity: "base" }`: works for equality but not substring matching; rejected.
- Pull `remove-accents` npm package: an extra dependency for a one-line helper we already use in the codebase (color-lookup); rejected.

---

## 4. Headless UI primitive for the autocomplete

**Decision**: Reuse the `Popover + Command + CommandInput + CommandList + CommandItem` stack from `@ramcar/ui`, which is the same stack `ColorSelect` already uses. For each input we render a `Popover` whose `PopoverTrigger` is the `Input` the user types into, and whose `PopoverContent` is a `Command` that filters via a custom `filter={}` callback.

- Brand: `filter` delegates to the memoized `Fuse` instance; returning `1` / `0` satisfies `cmdk`'s positive/negative contract.
- Model: `filter` delegates to the hand-rolled normalized-matcher; same pattern.
- Free-text fallback is an always-present synthetic `CommandItem` at the bottom of the list, whose `value` includes `__add_custom__` plus the normalized typed text so it never matches a dataset entry by accident. Same technique as `ColorSelect`'s "Add custom color" row at color-select.tsx:289.

**Rationale**:
- `cmdk` gives us keyboard navigation (ArrowUp/ArrowDown, Enter, Escape) out of the box — satisfies FR-015 and SC-005 with no custom `onKeyDown` code.
- Reusing the `ColorSelect` pattern keeps UX consistency across the vehicle form and keeps the mental-model cost of adding this feature small.
- `Popover` positioning, `aria-expanded`, `role=combobox` are handled by `@ramcar/ui` / Radix already.

**Alternatives considered**:
- Build a custom combobox from scratch using React state + keyboard handlers. Rejected — reimplements what `cmdk` gives us and introduces a second idiom in the vehicle form next to `ColorSelect`.
- Use `react-select` or `downshift`. Rejected — heavier dependencies, and `react-select` specifically has a poor keyboard story for our "pick and move on" flow; we'd also be introducing a new styling axis inconsistent with our Radix/Tailwind stack.

---

## 5. Year input control

**Decision**: Use a standard `<Input type="number" inputMode="numeric" min={1960} max={currentYear + 1} step={1}>` from `@ramcar/ui`. Validation is handled by the same Zod schema that validates brand/model — `z.number().int().min(1960).max(currentYear + 1).optional()` — and surfaced through the form's existing submit path. Empty string → `undefined` → persisted as null (FR-011).

- `currentYear` is evaluated at schema-factory time, not once at module load, so the upper bound tracks calendar year without requiring a redeploy at midnight Dec 31 (in practice a daily re-evaluation is sufficient; we read `new Date().getFullYear()` inside the form component before constructing the schema on submit).
- HTML5 `type="number"` gives us the native numeric keypad on mobile/tablet (guard booth tablets) and handles most malformed input at the browser level, with Zod as the authoritative validator.

**Rationale**:
- Year is optional and simple. No autocomplete. No calendar picker (overkill). A numeric input with Zod validation is the minimum viable control that satisfies FR-010, FR-011, and SC-004.
- Placing the upper bound at `currentYear + 1` accommodates manufacturers listing "next model year" vehicles that arrive at dealerships before Jan 1 — common in the Mexico market.

**Alternatives considered**:
- `type="text"` with manual regex validation: rejected — no numeric-keypad hint and reinvents `type="number"` handling.
- Dropdown of years: rejected — a 60-entry dropdown is worse UX than typing four digits, and it's one more thing to keep in sync.
- Make year required: rejected per spec FR-011 — explicitly optional.

---

## 6. Data model change: `vehicles.year` column

**Decision**: Add a single nullable integer column `year` to `public.vehicles` via a new Supabase migration. Type `smallint` is sufficient (max 32767 far exceeds the upper bound 2100); nullable with no default. A `CHECK` constraint mirrors the Zod bounds so bad writes bypassing the API fail at the DB layer too:

```sql
ALTER TABLE public.vehicles
  ADD COLUMN year smallint,
  ADD CONSTRAINT chk_vehicles_year CHECK (year IS NULL OR (year >= 1960 AND year <= 2100));
```

Upper DB bound is `2100` (not `currentYear + 1`) because the DB cannot evaluate "current year" in a CHECK constraint portably, and the API-layer Zod schema is authoritative. `2100` is a loose tripwire for clearly-nonsense values without blocking the API from advancing `currentYear + 1` over time. No backfill — existing rows remain `NULL`, which is exactly the "year was never recorded" semantic.

The migration also regenerates `@ramcar/db-types` via `pnpm db:types` (no manual edit — Principle VII).

**Rationale**:
- `smallint` is 2 bytes, half the storage of `integer`, and 1960–2100 fits comfortably.
- Nullable is the obvious shape for an optional field.
- Defense-in-depth `CHECK` aligns with Principle VI ("DB-level RLS policies MUST mirror API-level role restrictions as a defense-in-depth measure") — the same logic applies to validation: mirror the Zod bounds as a DB constraint so direct DB writes (migrations, backend scripts) can't insert garbage.
- No migration-data-step needed; all existing rows are simply `NULL`.

**Alternatives considered**:
- Store `year` as `integer`: marginal storage cost, no gain. Rejected in favor of `smallint`.
- Store `year` as a `date` with month/day = `01-01`: rejected — invents granularity the feature doesn't need.
- Store the year as part of a JSONB "details" column: rejected — ad-hoc JSONB for a well-typed scalar is a known anti-pattern.
- Skip the DB column and derive year from another field: no other field carries the year. Rejected.

---

## 7. Shared Zod schema change

**Decision**: Extend `createVehicleSchema` in `packages/shared/src/validators/vehicle.ts` to include an optional `year` field. Because the existing schema is a discriminated union over `ownerType`, the cleanest approach is to add `year` to the shared `vehicleFields` object once (not in each branch):

```ts
// packages/shared/src/validators/vehicle.ts — sketch
const currentYear = () => new Date().getFullYear();

const vehicleFields = {
  vehicleType: vehicleTypeEnum,
  brand: z.string().max(100).optional().or(z.literal("")),
  model: z.string().max(100).optional().or(z.literal("")),
  plate: z.string().max(20).optional().or(z.literal("")),
  color: z.string().max(50).optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  year: z.number().int().min(1960).max(currentYear() + 1).optional(),
};
```

`vehicles.ts` type grows `year: number | null`. `Vehicle` response DTO grows `year: number | null`. The DB repository maps `dto.year ?? null` on insert and selects `year` back in reads.

A separate, small `updateVehicleSchema` (new) is introduced only if the vehicle-edit flow is actually in scope. Per the current vehicle module (`apps/api/src/modules/vehicles/dto/create-vehicle.dto.ts`) edits are not yet supported; we do NOT introduce `updateVehicleSchema` speculatively — the create path is the only write path affected.

**Rationale**:
- Principle V (Shared Validation via Zod) forbids duplication — schema lives in `@ramcar/shared` once, consumed by the NestJS Zod validation pipe and by the form.
- `currentYear()` as a factory (not a module-level constant) so tests and future components always see the calendar-correct bound. The cost is one `Date` construction per schema use — negligible.
- No new schema if we don't need one (no `updateVehicleSchema`) — avoids scope creep.

**Alternatives considered**:
- Put year in each branch of the discriminated union: redundant and error-prone. Rejected.
- Introduce a separate `yearSchema` and `.and()` it into each branch: needlessly decorative. Rejected.

---

## 8. Public API surface of `@ramcar/features` for this feature

**Decision**: Add a new `./src/shared/vehicle-brand-model/` directory with:

```text
packages/features/src/shared/vehicle-brand-model/
├── data.ts                 # Curated dataset (top-level export)
├── data.test.ts            # Invariants (no duplicates, shape, etc.)
├── search.ts               # normalizeForSearch, buildBrandIndex, searchModels
├── search.test.ts
├── vehicle-brand-select.tsx    # Brand autocomplete component
├── vehicle-model-select.tsx    # Model autocomplete component
├── vehicle-year-input.tsx      # Thin wrapper around <Input type="number">
└── index.ts                # Public barrel
```

`packages/features/src/shared/index.ts` re-exports:

```ts
export { VehicleBrandSelect } from "./vehicle-brand-model/vehicle-brand-select";
export { VehicleModelSelect } from "./vehicle-brand-model/vehicle-model-select";
export { VehicleYearInput } from "./vehicle-brand-model/vehicle-year-input";
export { VEHICLE_BRAND_MODEL } from "./vehicle-brand-model/data";
export { normalizeForSearch, buildBrandIndex, searchModels } from "./vehicle-brand-model/search";
```

Plus a new `./shared/vehicle-brand-model` entry in `packages/features/package.json`'s `exports` map so host apps can deep-import if they prefer.

**Component prop contracts** (final names and shapes live in `contracts/`):

```ts
export interface VehicleBrandSelectProps {
  value: string | null;
  onChange: (brand: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  id?: string;
}

export interface VehicleModelSelectProps {
  brand: string | null;       // drives enablement; null → disabled
  value: string | null;
  onChange: (model: string | null) => void;
  placeholder?: string;
  disabled?: boolean;         // any additional disabled reason from the parent
  ariaLabel?: string;
  id?: string;
}

export interface VehicleYearInputProps {
  value: number | null;
  onChange: (year: number | null) => void;
  disabled?: boolean;
  id?: string;
}
```

**Rationale**:
- Consistent with how `ColorSelect` is structured inside the same `packages/features/src/shared/` tree — reviewers already understand this layout.
- Separate files for brand/model/year means each has a tight surface, easy-to-read tests, and discrete stories. A single monolithic "VehicleBrandModelYearInput" would bundle three concerns and be harder to test in isolation.
- `VehicleBrandSelect` and `VehicleModelSelect` are decoupled via the `brand` prop rather than internally sharing state, keeping the components purely presentational and leaving state ownership with the parent form (matches the existing `ColorSelect` pattern).

**Alternatives considered**:
- One composite `VehicleIdentityFields` component owning brand/model/year together: rejected — defeats reuse (if a future form wants brand alone) and hides state from the parent.
- Exposing the dataset as `@ramcar/shared` instead of `@ramcar/features`: rejected — the dataset is UI-tier reference data, not a cross-cutting domain type. Keeping it with the component that consumes it matches the "vertical slice" pattern of `@ramcar/features`.

---

## 9. Integration into the existing `VehicleForm`

**Decision**: Replace the two plain `<Input>` fields for `brand` and `model` inside `packages/features/src/shared/vehicle-form/vehicle-form.tsx` (lines 111–127) with `<VehicleBrandSelect>` and `<VehicleModelSelect>`. Add a `<VehicleYearInput>` below color/notes. The internal `useState` pieces (`brand`, `model`) stay unchanged in shape; add `year: number | null` alongside. The `initialDraft` prop and the `onDraftChange` contract both extend to include `year`.

The draft-persistence code path (`onDraftChange` / `useFormPersistence` on web) is deliberately left alone — the existing "user-typed a draft and the window reloaded" story continues to work because draft shape is the same flat object, just with three more keys (none of which change existing persisted drafts' decode — unknown keys are ignored).

**Rationale**:
- Minimal risk — we swap the inputs, the surrounding form scaffolding stays identical (label, spacing, error handling, submit path).
- The existing `useFormPersistence` extension point (web only, per CLAUDE.md's "canonical deliberate divergences") continues to just work because the draft shape is additive.

**Alternatives considered**:
- Build a new form wrapper `VehicleForm.v2` in parallel and swap call sites: rejected — overkill for a field-level change, creates a deprecation path with no benefit.
- Make brand/model autocomplete a "bolted-on" enhancement where the plain inputs remain fallback: rejected — produces two UX code paths and the feature becomes harder to reason about.

---

## 10. Offline behavior (desktop guard booth)

**Decision**: No runtime offline-specific code needed. The brand/model dataset is bundled into the Electron renderer bundle as a plain TS import; there is no network path in the autocomplete to fail. Vehicle **writes** continue to go through the existing outbox transport adapter (wired at the desktop host), unchanged by this feature. Desktop E2E asserts that the autocomplete functions with the network interface disabled.

**Rationale**:
- Constitution Principle IV (Offline-First Desktop) says the guard booth MUST work without network. The autocomplete satisfies this by construction — the dataset is in the bundle, the search is in-process, `Fuse` has no I/O.
- Not introducing a runtime dataset fetch eliminates an entire offline failure mode. No cache invalidation, no "dataset unavailable" UI state, no sync engine involvement for the dataset.
- The outbox write path is the existing desktop transport adapter (per spec 014 research); the `year` field rides along inside the existing payload shape.

**Alternatives considered**:
- Serve the dataset from the NestJS API and cache it in the SQLite outbox: rejected — violates FR-017, adds complexity, doubles the source of truth, and is strictly worse on latency (SC-003).
- Ship the dataset as a Supabase Storage JSON and fetch on first open: same rejection.

---

## 11. i18n keys to add to `@ramcar/i18n`

**Decision**: Extend the existing `vehicles` namespace in `packages/i18n/src/messages/{en,es}.{json,ts}`:

```json
"vehicles": {
  "brand": {
    "label": "Brand",
    "placeholder": "Search brand…",
    "searchPlaceholder": "Search brand…",
    "noResults": "No match — use what you typed?",
    "addCustom": "Use \"{query}\" as brand",
    "ariaLabel": "Brand"
  },
  "model": {
    "label": "Model",
    "placeholder": "Search model…",
    "disabled": "Pick a brand first",
    "noResults": "No match — use what you typed?",
    "addCustom": "Use \"{query}\" as model",
    "ariaLabel": "Model"
  },
  "year": {
    "label": "Year",
    "placeholder": "e.g., 2019",
    "invalid": "Enter a valid year (1960–{max})",
    "ariaLabel": "Year"
  }
}
```

Spanish:

```json
"vehicles": {
  "brand": {
    "label": "Marca",
    "placeholder": "Buscar marca…",
    "searchPlaceholder": "Buscar marca…",
    "noResults": "Sin coincidencia — ¿usar lo escrito?",
    "addCustom": "Usar \"{query}\" como marca",
    "ariaLabel": "Marca"
  },
  "model": {
    "label": "Modelo",
    "placeholder": "Buscar modelo…",
    "disabled": "Selecciona una marca primero",
    "noResults": "Sin coincidencia — ¿usar lo escrito?",
    "addCustom": "Usar \"{query}\" como modelo",
    "ariaLabel": "Modelo"
  },
  "year": {
    "label": "Año",
    "placeholder": "Ej: 2019",
    "invalid": "Ingresa un año válido (1960–{max})",
    "ariaLabel": "Año"
  }
}
```

Existing keys `vehicles.brand.label`, `vehicles.brand.placeholder`, `vehicles.model.label`, `vehicles.model.placeholder` are kept verbatim (the values don't change) so the rest of the form continues to work unchanged; only new keys are added.

**Rationale**:
- Single source of truth per Principle III and the cross-app sharing policy (CLAUDE.md). Each app's message file is the JSON-merged consumer; duplicating strings in both apps is a review-blocker per the red-flag checklist.
- Keys mirror the existing `vehicles.color.*` structure so reviewers find strings at predictable paths.
- The interpolation placeholder `{query}` / `{max}` matches `t(key, values?)` adapter shape — both `next-intl` and `react-i18next` handle `{name}` substitution by default.

**Alternatives considered**:
- New top-level namespace `vehicleAutocomplete`: rejected — strings belong with the existing `vehicles` tree.
- Share a single `common.pickOrUse` key: rejected — the English/Spanish wording is clearer when specialized per field ("brand" / "model").

---

## 12. Tests & benchmarks

**Decision**:
- **Unit** (`vitest` under `packages/features`):
  - `data.test.ts` — invariants (no duplicate brands, no empty model lists, canonical whitespace, sanity brand-count band).
  - `search.test.ts` — `normalizeForSearch`, brand fuzzy matching (known typos → expected matches), model `startsWith`/`includes` ranking, cap at 10 results.
  - `vehicle-brand-select.test.tsx` — typing "nis" shows "Nissan"; Enter selects; ArrowDown/ArrowUp navigate; Escape closes; free-text fallback renders when no dataset match.
  - `vehicle-model-select.test.tsx` — disabled with no brand; enabled after brand; scoped to brand's models; free-text fallback; resets when brand changes.
  - `vehicle-year-input.test.tsx` — valid year → onChange called; out-of-range → validation error; empty → null.
- **Microbenchmark** (CI):
  - `search.bench.ts` — measures p95 brand search time over 10,000 iterations against the full dataset. Fails CI if p95 > 50 ms (SC-003).
- **Integration (web)** (`playwright`): existing vehicle-form E2E updated to use the autocomplete; assert persisted `brand` / `model` / `year` values.
- **Integration (desktop)** (`vitest` with jsdom + mocked `window.electron`): assert offline autocomplete (network disabled) still renders and commits free-text fallback through outbox transport.
- **Network-traffic assertion** (Playwright): exercise the autocomplete, assert zero `fetch`/XHR calls were issued by the component (SC-004).
- **Keyboard-only assertion** (Playwright): a test that uses `keyboard.press()` only (no `click`) for the entire brand → model → save flow (SC-005).

**Rationale**:
- Tests map 1:1 to the spec's success criteria (SC-001 through SC-008).
- Microbenchmarking the search is cheap (<1 s in CI) and locks in the <50 ms guarantee so a future contributor can't silently introduce a quadratic regression.
- Existing `packages/features/src/test/` infrastructure (Vitest + `@testing-library/react`) already supports this — no new test runner needed.

**Alternatives considered**:
- Skip the microbenchmark and trust code review: rejected — performance is a spec-level commitment (FR-016, SC-003); benchmark it or lose it.
- Only test at the Playwright level: rejected — flaky-prone and slow to iterate; unit tests catch the 80% of search logic bugs.

---

## Resolved vs. deferred

All NEEDS CLARIFICATION markers from `plan.md`'s initial Technical Context are resolved above:

| Topic | Decision | Rationale section |
|---|---|---|
| Fuzzy library | `fuse.js` for brand; hand-rolled for model | §1 |
| Dataset source | Hand-curated Mexico top-brand TS module in `@ramcar/features` | §2 |
| Normalization | NFD + combining-mark strip + lowercase + trim | §3 |
| UI primitive | `cmdk` via `@ramcar/ui` (same pattern as `ColorSelect`) | §4 |
| Year control | `<Input type="number">` + Zod bounds | §5 |
| DB change | `vehicles.year smallint NULL` with `CHECK` | §6 |
| Shared schema | Extend `createVehicleSchema.vehicleFields.year` | §7 |
| Package surface | New `./shared/vehicle-brand-model/` inside `@ramcar/features` | §8 |
| Form integration | Swap inputs inside existing `VehicleForm` | §9 |
| Offline strategy | Bundled dataset — no runtime I/O | §10 |
| i18n keys | New children under `vehicles.brand / model / year` | §11 |
| Tests | Unit + microbench + Playwright keyboard/network asserts | §12 |

Nothing is deferred to Phase 1 or later.
