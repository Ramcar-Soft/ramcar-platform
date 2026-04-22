# Implementation Plan: Vehicle Brand & Model Autocomplete (Mexico Market)

**Branch**: `016-vehicle-brand-model-autocomplete` | **Date**: 2026-04-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/016-vehicle-brand-model-autocomplete/spec.md`

## Summary

Replace the free-text `brand` and `model` inputs on the vehicle form with a keyboard-first autocomplete pair backed by a curated, Mexico-market dataset bundled into the client. Brand search is fuzzy (fuse.js) over ~25–35 brand keys; model search is hand-rolled `startsWith`/`includes` scoped to the currently selected brand. Both inputs support a "Use '<typed text>'" free-text fallback for vehicles not in the dataset. Add an optional numeric `year` field persisted on `public.vehicles` via a new nullable `smallint` column. The shared components live in `@ramcar/features` and are consumed once by both `apps/web` and `apps/desktop` — zero per-app duplication, zero runtime network I/O for dataset lookup. The only API surface change is one new optional field (`year`) on the existing `POST /api/vehicles` payload, enforced by the shared Zod schema in `@ramcar/shared`.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 22 LTS

**Primary Dependencies**:

- `@ramcar/features` (existing shared package) — new `shared/vehicle-brand-model/` subdirectory hosting the dataset module, the search helpers, and the three components (`VehicleBrandSelect`, `VehicleModelSelect`, `VehicleYearInput`).
- `fuse.js` — NEW top-level dependency under `packages/features/package.json`. Used for brand fuzzy search only. Dataset is tiny (≤50 brands), index is memoized at module load.
- `@ramcar/ui` — consumed `Popover`, `Command*`, `Input`, `Button` primitives (no new shadcn additions needed; the color-select pattern proves this stack works here).
- `@ramcar/shared` — `createVehicleSchema` extended with `year: z.number().int().min(1960).max(currentYear()+1).optional()`.
- `@ramcar/i18n` — new keys under `vehicles.{brand, model, year}` (single source of truth for both apps).
- `@ramcar/db-types` — regenerated after the `year`-column migration.
- NestJS Zod validation pipe (existing) — automatically picks up the new `year` field.

**Storage**:

- PostgreSQL via Supabase — one schema change: `public.vehicles` gains a nullable `smallint` column `year` with a `CHECK` constraint `year IS NULL OR (year >= 1960 AND year <= 2100)`. No new table, no new index, no new RLS policy (existing per-tenant policy covers the new column).
- Supabase Storage — unchanged.
- SQLite (desktop outbox) — unchanged shape. The `year` field rides inside the existing vehicle-create payload.
- Brand/model dataset — **static TypeScript module** bundled into the client. Not in Postgres, not in Supabase Storage, not fetched at runtime.

**Testing**:

- `packages/features`: Vitest + `@testing-library/react` for component tests; Vitest for data-invariant tests and the search microbenchmark.
- `packages/shared`: Vitest for the extended `createVehicleSchema` (year bound evaluation with fixed system time).
- `apps/api`: Jest + ts-jest integration tests for `POST /api/vehicles` accepting/rejecting `year` per the schema.
- `apps/web`: Playwright E2E for the full vehicle form flow, plus a network-traffic assertion (zero fetches by the autocomplete) and a keyboard-only assertion.
- `apps/desktop`: Vitest + jsdom integration for the offline autocomplete flow; existing outbox test infrastructure covers the write path.

**Target Platform**:

- Web (Next.js 16 App Router) on modern browsers.
- Desktop (Electron 30 + Vite + React 19 renderer) on macOS, Windows, Linux — must function fully offline.
- API (NestJS v11) on Node.js 22.

**Project Type**: Monorepo feature in `@ramcar/features` (consumed by `apps/web` + `apps/desktop`) with a minor DB + API + shared-schema change. No new workspace package.

**Performance Goals**:

- Brand suggestion p95 < 50 ms for the full dataset on a reviewer laptop (spec SC-003). Asserted by a CI microbenchmark.
- Model suggestion p95 < 50 ms — trivially satisfied (max ~30 entries for the largest brand).
- Zero runtime fetch requests issued by the autocomplete (spec SC-004). Asserted by a Playwright network-traffic test.

**Constraints**:

- NON-NEGOTIABLE: Constitution Principles III (Strict Import Boundaries), IV (Offline-First Desktop), V (Shared Validation via Zod), VII (TypeScript Strict Mode), VIII (API-First Data Access).
- No per-app duplication under `apps/*/src/features/` for the brand/model components (enforced by `pnpm check:shared-features` — the shared-features manifest will be amended to include `vehicle-brand-model`).
- No runtime network I/O for dataset lookup; dataset is bundled and in-memory.
- Initial scope: `vehicleType === "car"` (sedan, SUV, pickup); other vehicle types keep plain-text brand/model inputs for now. The component is pluggable enough to accept other datasets later without refactor, but we do not author those datasets in this feature.

**Scale/Scope**:

- Dataset size target: ~25–35 brands × avg 10–20 models ≈ 300–700 model entries. Comfortably inside the spec's 1,000–2,500 envelope and well under 50 KB on disk.
- Consumers: one form (`packages/features/src/shared/vehicle-form/vehicle-form.tsx`) used by residents vehicles, visitors vehicles, and service-provider vehicles across web and desktop.
- Net new source code target: ~800–1,200 lines across components + search helpers + dataset + tests + i18n + migration + schema extension + API tests. No net reduction (the free-text inputs were already small); the headline win is data quality and UX, not code volume.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | How this plan complies |
|---|---|
| **I. Multi-Tenant Isolation (NON-NEGOTIABLE)** | No new query path. The only write change is an extra optional field on `POST /api/vehicles`, which the existing `TenantGuard` + `@CurrentTenant()` already scope. RLS policies on `vehicles` are unchanged and cover the new column. TanStack Query keys for vehicle reads continue to include `tenantId` per the existing convention. |
| **II. Feature-Based Architecture** | All new code lives in `packages/features/src/shared/vehicle-brand-model/` — a vertical slice inside the existing `@ramcar/features` package. No business logic added to `src/app/` (web), `page-router.tsx` (desktop), or `common/` (API). |
| **III. Strict Import Boundaries (NON-NEGOTIABLE)** | Dependency graph stays unidirectional. `@ramcar/features` imports from `@ramcar/ui`, `@ramcar/shared`, `@ramcar/i18n`; it does NOT import `next/*`, `window.electron`, Node APIs, or a concrete i18n library. The existing ESLint restricted-import rules in `@ramcar/features` continue to pass. Inside the feature slice, no cross-slice imports (this slice lives under `shared/` alongside `color-select`, `vehicle-form`, etc., all of which follow the same rule). |
| **IV. Offline-First Desktop (NON-NEGOTIABLE)** | Dataset is a bundled static TS module — no network path means nothing to fail offline. The `year`-augmented write payload continues to route through the existing desktop outbox transport adapter; the autocomplete is oblivious to transport. Existing `SyncSlice` states are unchanged. |
| **V. Shared Validation via Zod (NON-NEGOTIABLE)** | `year` is added once in `@ramcar/shared`'s `createVehicleSchema.vehicleFields`. The NestJS Zod pipe and the shared `VehicleForm` reuse the same schema. Duplicate schema definitions are not introduced. |
| **VI. Role-Based Access Control** | Unchanged. The API endpoints being extended already enforce `@Roles('super_admin', 'admin', 'guard')`. RLS policies on `vehicles` mirror this. No new role-gated UI is introduced. |
| **VII. TypeScript Strict Mode** | All new code extends `@ramcar/config`'s strict base (inherited via the `@ramcar/features` and `@ramcar/shared` tsconfigs). No `any`. `VEHICLE_BRAND_MODEL` is typed as `Readonly<Record<string, readonly string[]>>` — no loose `{ [k: string]: any }`. `@ramcar/db-types` is regenerated via `pnpm db:types` after the migration (never hand-edited). |
| **VIII. API-First Data Access (NON-NEGOTIABLE)** | Vehicle writes continue to go through `POST /api/vehicles` (NestJS → Repository → Supabase). The brand/model dataset lookup is entirely client-side and entirely non-DB — it is NOT a database operation, so the "API-first" rule does not apply to it (and we have explicit spec commitments FR-017 and SC-004 that keep it that way). No `supabase.from()`, `.rpc()`, or `.storage` is added anywhere in the frontend. |

**Gate result**: **PASS** (pre-Phase-0). Re-checked post-Phase-1 below — still **PASS**.

No violations. The Complexity Tracking table below is empty.

## Project Structure

### Documentation (this feature)

```text
specs/016-vehicle-brand-model-autocomplete/
├── spec.md              # Feature specification (authored before this plan)
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0: technology / approach decisions
├── data-model.md        # Phase 1: entity + schema definitions
├── quickstart.md        # Phase 1: engineer how-to
├── contracts/           # Phase 1: component + dataset + API contracts
│   ├── vehicle-brand-select.contract.ts
│   ├── vehicle-model-select.contract.ts
│   ├── vehicle-year-input.contract.ts
│   ├── dataset-schema.contract.ts
│   └── vehicles-api-year-extension.md
└── tasks.md             # Phase 2: task breakdown (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Database
supabase/migrations/
└── {timestamp}_add_year_to_vehicles.sql              # NEW — adds vehicles.year smallint + CHECK

# Shared packages
packages/shared/src/
├── validators/vehicle.ts                             # MODIFIED — vehicleFields.year added, currentYear() factory
└── types/vehicle.ts                                  # MODIFIED — Vehicle.year: number | null

packages/db-types/                                    # REGENERATED via pnpm db:types

packages/i18n/src/messages/
├── en.json                                           # MODIFIED — new vehicles.{brand, model, year} keys
├── es.json                                           # MODIFIED — new vehicles.{brand, model, year} keys
├── en.ts                                             # Regenerated (derived from en.json)
└── es.ts                                             # Regenerated (derived from es.json)

packages/features/
├── package.json                                      # MODIFIED — fuse.js dependency added
└── src/
    ├── index.ts                                      # (unchanged — re-exports still come from shared/)
    └── shared/
        ├── index.ts                                  # MODIFIED — add VehicleBrandSelect / VehicleModelSelect / VehicleYearInput exports
        ├── vehicle-form/
        │   └── vehicle-form.tsx                      # MODIFIED — swap brand/model Inputs for autocomplete components; add year input; extend draft shape
        └── vehicle-brand-model/                      # NEW DIRECTORY
            ├── data.ts                               # NEW — curated Mexico dataset, frozen
            ├── data.test.ts                          # NEW — invariant tests
            ├── search.ts                             # NEW — normalizeForSearch, buildBrandIndex (fuse.js), searchModels
            ├── search.test.ts                        # NEW
            ├── search.bench.ts                       # NEW — microbenchmark asserting p95 < 50ms
            ├── vehicle-brand-select.tsx              # NEW — fuzzy brand autocomplete (cmdk-based)
            ├── vehicle-brand-select.test.tsx         # NEW
            ├── vehicle-model-select.tsx              # NEW — startsWith/includes model autocomplete
            ├── vehicle-model-select.test.tsx         # NEW
            ├── vehicle-year-input.tsx                # NEW — numeric input with Zod-aligned bounds
            ├── vehicle-year-input.test.tsx           # NEW
            └── index.ts                              # NEW — public barrel for this slice

# Shared features manifest (CI duplication check)
shared-features.json                                  # MODIFIED — add "vehicle-brand-model" entry under shared primitives

# API
apps/api/src/modules/vehicles/
├── vehicles.repository.ts                            # MODIFIED — insert dto.year ?? null; bare select returns year
└── __tests__/vehicles.e2e-spec.ts (or equivalent)    # MODIFIED — add year validation tests (accepts 2019; rejects 1800, 2.5, "abc")

# Web (apps/web)
apps/web/src/features/residents/
└── (existing vehicle draft-persistence code)         # MODIFIED — draft shape extended with year (additive; persisted drafts forward-compatible)
apps/web/tests/e2e/
└── vehicle-form.spec.ts                              # NEW — Playwright E2E (keyboard-only flow, zero-fetch assertion, year persisted)

# Desktop (apps/desktop)
apps/desktop/src/                                     # NO CODE CHANGES beyond the dataset being bundled
apps/desktop/src/test/                                # NEW — integration test: offline autocomplete + outbox year persistence
```

**Structure Decision**: Vertical slice added to the existing `@ramcar/features` package, following the same layout pattern as the sibling `color-select/` slice (canonical reference: `packages/features/src/shared/color-select/`). The existing `VehicleForm` absorbs the three new inputs directly — no new wrapper component, no parallel "v2" form. One DB migration, one shared schema extension, one API test-coverage bump. No new workspace package, no new API endpoint, no new Supabase table, no changes to the desktop outbox operation kinds.

## Implementation Phases

### Phase 1: Foundation (data + shared schema + migration)

**Goal**: The raw data and type plumbing exist; no UI yet; everything compiles and `pnpm typecheck` passes.

1. **Curate the Mexico dataset.** Populate `packages/features/src/shared/vehicle-brand-model/data.ts` with the brand/model entries per the research §2 sourcing plan (AMDA, INEGI, manufacturer Mexico sites). Freeze the object.
2. **Author the dataset invariant tests** (`data.test.ts`) covering I-D1 through I-D6 from `data-model.md` §1.
3. **Author the search helpers.** Implement `normalizeForSearch`, `buildBrandIndex` (fuse.js config per research §1), `searchModels` (rank startsWith → includes, cap 10). Add `search.test.ts` + `search.bench.ts`.
4. **Extend the shared Zod schema** in `packages/shared/src/validators/vehicle.ts` with `year` — use the `currentYear()` factory approach per research §7. Extend `packages/shared/src/types/vehicle.ts` `Vehicle.year: number | null`.
5. **Write the DB migration** `supabase/migrations/{timestamp}_add_year_to_vehicles.sql` per `data-model.md` §2. Apply with `pnpm db:migrate:dev`; regenerate `@ramcar/db-types` via `pnpm db:types`.
6. **Add `fuse.js` dependency** to `packages/features/package.json`. Run `pnpm install`.
7. **Extend i18n** in `packages/i18n/src/messages/{en,es}.json` per research §11.

**Verification**: `pnpm typecheck` across the monorepo passes. `pnpm --filter @ramcar/features test` runs the dataset, search, and benchmark tests; all pass. `pnpm --filter @ramcar/shared test` confirms the schema bounds test.

### Phase 2: Components

**Goal**: Three components with their unit tests green.

1. **`VehicleBrandSelect`** — implement per the contract at `contracts/vehicle-brand-select.contract.ts`. Use the `Popover + Command*` pattern from `color-select.tsx` as a structural reference. Plug the memoized `Fuse` index into `cmdk`'s `filter` prop. Render a synthetic `__add_custom__` fallback row at the top of the list (mirrors `color-select.tsx:289`).
2. **`VehicleModelSelect`** — same shell, but: disable when `brand === null` (show a tooltip / aria-describedby referencing `vehicles.model.disabled`); if `brand` is a dataset key, filter that brand's models with the hand-rolled `searchModels`; if `brand` is a free-text value (not in the dataset), show only the fallback row.
3. **`VehicleYearInput`** — thin wrapper over `@ramcar/ui` `Input` with `type="number"`, `inputMode="numeric"`, `min=1960`, `max={currentYear+1}`. Parsing helpers: empty → `null`; digits → `Number()`.
4. **Unit tests for each component** against the behavior contracts B1–B11 (brand), M1–M8 (model), Y1–Y5 (year).

**Verification**: `pnpm --filter @ramcar/features test` remains green including the new component tests. Visual check in Storybook or a dev sandbox is optional but recommended.

### Phase 3: Vehicle form integration

**Goal**: The existing `VehicleForm` uses the new components end-to-end. Both apps see the new UX.

1. **Swap inputs** in `packages/features/src/shared/vehicle-form/vehicle-form.tsx` — replace the plain brand and model `<Input>` rows with `<VehicleBrandSelect>` and `<VehicleModelSelect>`. Add `<VehicleYearInput>` after color / before notes.
2. **Extend the local state** with `year: number | null`. Extend `initialDraft` and `onDraftChange` prop shapes accordingly. Wire the "clear model on brand change / brand clear" rules in the parent's `onChange` handler per `quickstart.md` Task 2.
3. **Update submit path** — pass `year: year ?? undefined` into `safeParse`. No other submit change.
4. **Update the web draft-persistence call site** (`apps/web/src/features/residents/…`) to initialize `year: null` and include it in the persisted-draft object. The existing `useFormPersistence` is forward-compatible (unknown keys are ignored by legacy decoders; new keys are added additively).
5. **Integration tests** at the `vehicle-form.test.tsx` level:
   - Selecting a dataset brand commits canonical spelling; picking free-text fallback commits verbatim.
   - Changing brand clears the previously committed model.
   - Submitting with a valid year persists it; leaving it blank persists `year: null`.

**Verification**: `pnpm --filter @ramcar/features test` stays green. Manual QA on both apps: form renders, autocompletes work, year persists via the API.

### Phase 4: API + DB write path

**Goal**: The API accepts and stores `year`, and the desktop outbox path transparently rides along.

1. **Repository** — update `apps/api/src/modules/vehicles/vehicles.repository.ts` to insert `year: dto.year ?? null`. Existing `.select()` calls already return all columns; regenerated `@ramcar/db-types` gives them the new typing.
2. **API tests** — extend `apps/api/src/modules/vehicles/__tests__/vehicles.e2e-spec.ts` (or the equivalent Jest file) with cases: `year: 2019` accepted; `year: 1800` rejected with ZodError on `year` path; `year` absent accepted; `year: 2.5` rejected.
3. **Desktop outbox** — no code change expected. Verify via a targeted integration test that an offline vehicle create with `year` replays correctly on reconnect.

**Verification**: `pnpm --filter @ramcar/api test` green. A local end-to-end manual run: create a vehicle with year 2019, reload the list, confirm the response includes `year: 2019`. Repeat offline on desktop, reconnect, confirm server sees `year: 2019`.

### Phase 5: E2E + non-regression coverage

**Goal**: The spec's success criteria (SC-001 through SC-008) have test-level assertions in CI.

1. **Web Playwright** — add `apps/web/tests/e2e/vehicle-form.spec.ts`:
   - Keyboard-only brand → model → year → save flow (SC-005).
   - Network-traffic assertion: the autocomplete issues zero `fetch`/XHR calls (SC-004).
   - Free-text fallback path.
   - Year-validation rejection path.
2. **Desktop integration (offline)** — add a test that disables the renderer's network and exercises the autocomplete (SC-006).
3. **Translation-key audit** — extend the existing i18n audit (if present) or add a minimal test that walks every `vehicles.brand.*`, `vehicles.model.*`, `vehicles.year.*` key in `en.json` and confirms it exists in `es.json` with a non-empty value (SC-007).
4. **Shared-features CI check** — add `vehicle-brand-model` to `shared-features.json` so `pnpm check:shared-features` flags future per-app duplicates (SC-008).

**Verification**: `pnpm test:e2e` and `pnpm check:shared-features` green.

### Phase 6: Dataset rollout + telemetry (light touch)

**Goal**: We have the minimum signal to later measure SC-001 and SC-002.

1. **Metric**: Log on the API side (info-level) the brand/model strings received in `POST /api/vehicles`. The existing request logger should already handle this; if not, don't introduce a new log channel — defer to whichever observability hook the platform adds next.
2. **Post-launch analysis** (out-of-plan but noted): 2 weeks post-launch, run a one-off query against the `vehicles` table to measure the share of `brand` and `(brand, model)` pairs that match the dataset. Compare to SC-001 and SC-002 thresholds.

**Verification**: This phase is observational — no new test required. It documents the measurement path for the success criteria rather than producing new code.

## Constitution Check (post-design)

Re-verified after completing `research.md`, `data-model.md`, `contracts/`, and `quickstart.md`. No design decision introduced a new principle violation.

| Principle | Post-design status |
|---|---|
| I. Multi-Tenant Isolation | **PASS**. Only the existing vehicle-create path gains one optional field; TenantGuard and RLS are unchanged. |
| II. Feature-Based Architecture | **PASS**. All new UI + logic lives inside a single `shared/vehicle-brand-model/` slice of `@ramcar/features`. |
| III. Strict Import Boundaries | **PASS**. No `next/*` / `window.electron` / Node imports in shared code; fuse.js is UI-tier and fine. |
| IV. Offline-First Desktop | **PASS**. Dataset is bundled; zero I/O required at search time. Write path still uses the existing outbox adapter. |
| V. Shared Validation via Zod | **PASS**. `year` added once in `@ramcar/shared/createVehicleSchema`; consumed verbatim by API and form. |
| VI. Role-Based Access Control | **PASS**. No new endpoints; existing role guards on `POST /api/vehicles` still apply. |
| VII. TypeScript Strict Mode | **PASS**. Dataset typed as `Readonly<Record<string, readonly string[]>>`; no `any`; db-types regenerated. |
| VIII. API-First Data Access | **PASS**. Vehicle writes remain API-routed. Dataset lookup is explicitly NOT a database operation (spec FR-017, SC-004). |

## Complexity Tracking

No constitution violations to justify. This table is intentionally empty.
