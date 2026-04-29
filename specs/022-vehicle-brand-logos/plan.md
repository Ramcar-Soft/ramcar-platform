# Implementation Plan: Vehicle Brand Logos

**Branch**: `022-vehicle-brand-logos` | **Date**: 2026-04-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/022-vehicle-brand-logos/spec.md`

## Summary

Attach a small **bundled SVG brand mark** to every vehicle brand the platform already recognizes via spec 016, and render it everywhere the brand text already appears — the brand autocomplete (suggestion rows + committed-value chip), every read-side surface that prints `vehicle.brand` (vehicle lists, cards, detail views, logbook columns), in both `apps/web` and `apps/desktop`. The lookup is a build-time static map (`BRAND_LOGO_REGISTRY`) keyed by the canonical brand name from `VEHICLE_BRAND_MODEL`, normalized at render time with the same `normalizeForSearch` helper the brand picker already uses, so legacy / mixed-case data resolves to the same logo. Unknown / free-text brands degrade to a fixed-size empty tile — no broken images, no layout shift. The component lives once in `@ramcar/features` and is consumed by both apps under the cross-app code-sharing constraint. Zero runtime network I/O for logo retrieval — required by Principle IV (Offline-First Desktop) and asserted by a Playwright network-traffic test plus a desktop offline integration test. Source SVGs come from `filippofilip95/car-logos-dataset` (MIT) and are committed inside the repo; a new CI script (`pnpm check:vehicle-brand-logos`) enforces a closed registry both directions, asset sanity, the 500 KB budget, and license attribution.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode across the monorepo), Node.js 22 LTS

**Primary Dependencies**:

- `@ramcar/features` — new slice `src/shared/vehicle-brand-logos/` housing `slugify.ts`, `logo-registry.ts`, `get-brand-logo-url.ts`, `vehicle-brand-logo.tsx`, `assets/*.svg`, `svg.d.ts`, plus tests. Re-exports through `@ramcar/features/shared` and a new `./shared/vehicle-brand-logos` package export.
- `@ramcar/features/shared/vehicle-brand-model` (existing) — `normalizeForSearch` and `VEHICLE_BRAND_MODEL` are imported by the new lookup; no behavior change.
- `@ramcar/ui` (existing) — already-consumed primitives (`cn` utility, no new shadcn additions). The `<VehicleBrandLogo />` component uses raw `<span>` + `<img>` for the tile + asset rendering.
- `@ramcar/i18n` — no new keys. The component is `aria-hidden`; the brand text alongside is the accessible label and is already translated.
- **No new top-level npm dependencies.** SVG bundling uses the bundler's default behavior (Next.js webpack + Vite/rollup default-import-as-URL). No `@svgr/webpack`, no `vite-plugin-svgr`, no `imagemin`-style preprocessor.

**Storage**:

- PostgreSQL via Supabase — **no schema change**. The existing `vehicles.brand` text column continues to drive logo lookup at render time via normalization.
- Supabase Storage — **not touched**. Logos are bundled application assets, not user uploads.
- SQLite (desktop outbox) — **not touched**. No new operation kinds, no new columns.
- Brand logo dataset — **20 static SVG files** committed under `packages/features/src/shared/vehicle-brand-logos/assets/`, indexed by a frozen TS map.

**Testing**:

- `packages/features` (Vitest + `@testing-library/react`):
  - `slugify.test.ts` — invariants I-S1…I-S4.
  - `logo-registry.test.ts` — invariants R1…R5 + closed-set check vs `VEHICLE_BRAND_MODEL`.
  - `get-brand-logo-url.test.ts` — behaviors B1…B8.
  - `vehicle-brand-logo.test.tsx` — behaviors V1…V10 + visual-snapshot dimensions.
  - `get-brand-logo-url.bench.ts` — micro-benchmark, asserts O(1) lookup stays well under 1 ms p95.
- `scripts/check-vehicle-brand-logos.ts` (Vitest unit-tests in `scripts/__tests__/check-vehicle-brand-logos.test.ts`) — fixtures simulate orphan-both-directions, abandoned files, oversized budget, missing attribution.
- `apps/web` (Playwright E2E):
  - `tests/e2e/vehicle-brand-logos.spec.ts` — keyboard flow + network listener (zero external `.svg` fetches) + console-error listener (zero broken-image warnings) for free-text fallback rows.
- `apps/desktop` (Vitest + jsdom integration):
  - `src/test/brand-logo-offline.test.ts` — disables the renderer's network and asserts logos render from local bundled URLs (SC-005).

**Target Platform**:

- Web (Next.js 16 App Router) on modern browsers (`apps/web`).
- Desktop (Electron 30 + Vite + React 18 renderer) on macOS, Windows, Linux — must function fully offline (`apps/desktop`).
- API and `apps/www`: untouched.

**Project Type**: Monorepo feature inside `@ramcar/features` consumed by `apps/web` + `apps/desktop`, plus a new CI orphan-check script under `scripts/`. No new workspace package, no new API endpoint, no DB migration.

**Performance Goals**:

- Brand-logo lookup p95 < 1 ms (O(1) `Map.get` over a 20-entry normalized index built once at module load). Asserted by `get-brand-logo-url.bench.ts`.
- Vehicle-form first-render time MUST stay within spec 016's <50 ms suggestion-render target (SC-003) — verified by extending the existing benchmark to render with `<VehicleBrandLogo />` adornments.
- Zero runtime fetch issued by the rendering component or lookup (SC-002, FR-013) — verified by Playwright + desktop integration tests.

**Constraints**:

- NON-NEGOTIABLE: Constitution Principles II (Feature-Based Architecture), III (Strict Import Boundaries), IV (Offline-First Desktop), VII (TypeScript Strict Mode), VIII (API-First Data Access).
- No per-app duplication under `apps/*/src/features/` — `vehicle-brand-logos` is added to `shared-features.json` `sharedPrimitives` so `pnpm check:shared-features` enforces it.
- No `next/*`, no `window.electron`, no Node API access from inside `@ramcar/features` (existing rule).
- No runtime network I/O for logo retrieval — bundled assets only (FR-004, FR-013, SC-002, SC-005).
- No DB schema change, no new API endpoint, no new DTO, no new desktop SQLite column (FR-005).
- Asset budget: 500 KB hard cap, 150 KB target across all bundled SVGs (research §8).
- Logo lookup MUST reuse the same `normalizeForSearch` helper as the brand picker (data-model §3, contract `get-brand-logo-url.contract.ts` B9).
- License attribution MUST land in `LICENSE-third-party.md` at repo root and the About surface of each app (FR-012, SC-009).

**Scale/Scope**:

- 20 brand SVGs at ~3–6 KB each ≈ 60–120 KB ungzipped on disk. ~5× headroom under the 500 KB cap.
- Net new code: ~600–800 lines across `slugify.ts` (~25), `logo-registry.ts` (~50), `get-brand-logo-url.ts` (~30), `vehicle-brand-logo.tsx` (~50), index/barrel/type-decl (~15), tests (~250), CI script (~150), spec/research/contracts/quickstart (already authored). No code is removed; consumer-side edits are 1–3 lines each at ~6 sites.
- Consumers updated: `vehicle-brand-select.tsx` (autocomplete + committed value), `vehicle-manage-list.tsx`, `visit-person-access-event-form.tsx` (visitors), `apps/web/src/features/logbook/components/{visitors,providers,residents}-columns.tsx` (3 files). Vehicle detail / cards in resident & visitor profiles get the same one-line edit if any are present beyond the named consumers.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design (post-design block at end).*

| Principle | How this plan complies |
|---|---|
| **I. Multi-Tenant Isolation (NON-NEGOTIABLE)** | No new query path. No DB read or write is added or modified. The TanStack Query keys for vehicle reads continue to include `tenantId` per the existing convention; this feature is purely presentation over already-fetched vehicle records. |
| **II. Feature-Based Architecture** | All new code lives in `packages/features/src/shared/vehicle-brand-logos/` — a vertical slice inside `@ramcar/features`. No business logic added to `src/app/` (web), `page-router.tsx` (desktop), or `common/` / `infrastructure/` (API — unchanged). |
| **III. Strict Import Boundaries (NON-NEGOTIABLE)** | The new slice imports only from `./` (its own files), `../vehicle-brand-model/search` (sibling slice, intra-package), and `@ramcar/ui` (allowed). It does NOT import `next/*`, `window.electron`, Node APIs, a concrete i18n library, or another feature slice. The existing ESLint restricted-import rules in `@ramcar/features` continue to pass. The new SVG type declaration (`svg.d.ts`) is a TypeScript ambient module — does not introduce a code-level import. |
| **IV. Offline-First Desktop (NON-NEGOTIABLE)** | The lookup table is a frozen TS map of bundler-resolved static-asset URLs. Every URL points at a file Vite copies into the desktop renderer's `dist/` directory at build time. No fetch, no Realtime channel, no network at all. SyncSlice is unchanged (no new sync state). The desktop offline integration test asserts logos render with the network disabled. |
| **V. Shared Validation via Zod** | Not applicable — no new request/response payload, no new form input, no new IPC message. The existing `createVehicleSchema` and `updateVehicleSchema` are unchanged. |
| **VI. Role-Based Access Control** | No new endpoints, no new role-gated UI, no role-conditional rendering. Logos display identically for all four roles wherever the underlying brand text already displays. |
| **VII. TypeScript Strict Mode** | All new code extends `@ramcar/config`'s strict base. No `any`. The `BRAND_LOGO_REGISTRY` is typed as `Readonly<Record<string, string>>`. The `*.svg` ambient module declaration constrains imports to `string` (the URL) so consumers see a typed value. `getBrandLogoUrl` returns `string \| null` — the `null` case is the explicit "no logo" signal. |
| **VIII. API-First Data Access (NON-NEGOTIABLE)** | No `supabase.from()`, `.rpc()`, or `.storage` is added. No new API endpoint or fetch call. The frontend reads the existing `vehicle.brand` field already returned by `GET /api/vehicles` — no new request, no new DTO. The bundled SVGs are NOT a database operation; they are static application assets, exactly the same category as `lucide-react` icons or shadcn primitives. |

**Gate result**: **PASS** (pre-Phase-0). Re-checked post-Phase-1 below — still **PASS**.

No violations. The Complexity Tracking table is empty.

## Project Structure

### Documentation (this feature)

```text
specs/022-vehicle-brand-logos/
├── spec.md                                            # Feature specification (authored before this plan)
├── plan.md                                            # This file (/speckit.plan output)
├── research.md                                        # Phase 0: technology / approach decisions (14 sections)
├── data-model.md                                      # Phase 1: static-asset entity + registry + lookup model
├── quickstart.md                                      # Phase 1: implement & verify operationally
├── contracts/                                         # Phase 1: function/component/CI contracts
│   ├── get-brand-logo-url.contract.ts                 # Lookup function signature + behavior B1–B9
│   ├── vehicle-brand-logo.contract.tsx                # Component prop shape + behavior V1–V10
│   ├── logo-registry.contract.ts                      # Registry shape + invariants R1–R6
│   └── ci-orphan-check.contract.md                    # CI script behavior C1–C7
└── tasks.md                                           # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
# Shared feature module — the home of this feature's code
packages/features/
├── package.json                                       # MODIFIED — add "./shared/vehicle-brand-logos" export entry
└── src/
    ├── index.ts                                       # (unchanged — re-exports come via shared/)
    └── shared/
        ├── index.ts                                   # MODIFIED — re-export VehicleBrandLogo + getBrandLogoUrl
        ├── vehicle-brand-logos/                       # NEW DIRECTORY
        │   ├── index.ts                               # NEW — public barrel
        │   ├── svg.d.ts                               # NEW — ambient module declaration: SVG default-import is string URL
        │   ├── slugify.ts                             # NEW — canonical name → ASCII slug
        │   ├── slugify.test.ts                        # NEW — invariants I-S1…I-S4
        │   ├── logo-registry.ts                       # NEW — frozen Record<string, string>; one explicit import per brand
        │   ├── logo-registry.test.ts                  # NEW — invariants R1…R5
        │   ├── get-brand-logo-url.ts                  # NEW — normalized lookup; returns string | null
        │   ├── get-brand-logo-url.test.ts             # NEW — behaviors B1…B8
        │   ├── get-brand-logo-url.bench.ts            # NEW — micro-benchmark for SC-003 parity
        │   ├── vehicle-brand-logo.tsx                 # NEW — <VehicleBrandLogo size brand className />
        │   ├── vehicle-brand-logo.test.tsx            # NEW — V1…V10 + visual-snapshot dims
        │   └── assets/                                # NEW DIRECTORY — bundled brand SVGs
        │       ├── byd.svg
        │       ├── chevrolet.svg
        │       ├── chirey.svg
        │       ├── ford.svg
        │       ├── gmc.svg
        │       ├── honda.svg
        │       ├── hyundai.svg
        │       ├── jac.svg
        │       ├── jeep.svg
        │       ├── kia.svg
        │       ├── mazda.svg
        │       ├── mg.svg
        │       ├── nissan.svg
        │       ├── peugeot.svg
        │       ├── ram.svg
        │       ├── renault.svg
        │       ├── seat.svg
        │       ├── subaru.svg
        │       ├── toyota.svg
        │       └── volkswagen.svg
        ├── vehicle-brand-model/
        │   └── vehicle-brand-select.tsx               # MODIFIED — render <VehicleBrandLogo size="sm"/> in suggestion rows + committed-value trigger
        └── vehicle-form/
            └── (no changes; the brand picker change above flows through automatically)

# Visitors (existing read-side consumer in shared package)
packages/features/src/visitors/components/
└── visit-person-access-event-form.tsx                 # MODIFIED — render <VehicleBrandLogo /> next to formatVehicleLabel(v)

packages/features/src/shared/vehicle-form/
└── vehicle-manage-list.tsx                            # MODIFIED — render <VehicleBrandLogo /> next to formatVehicleLabel(v)

# Web logbook (read-side surface — not a shared feature today)
apps/web/src/features/logbook/components/
├── visitors-columns.tsx                               # MODIFIED — replace formatVehicleSummary string with JSX cell that includes <VehicleBrandLogo />
├── providers-columns.tsx                              # MODIFIED — same
└── residents-columns.tsx                              # MODIFIED — same

# Resident and visitor profile vehicle cards (if present)
apps/web/src/features/{residents,visitors}/...         # MODIFIED — one-line additions where vehicle.brand text is rendered
apps/desktop/src/features/{residents,visitors}/...     # MODIFIED — same; vehicle list/cell sites in the desktop renderer

# CI script — orphan + budget + attribution check
scripts/
├── check-vehicle-brand-logos.ts                       # NEW — implements C1…C7 from contracts/ci-orphan-check.contract.md
└── __tests__/
    └── check-vehicle-brand-logos.test.ts              # NEW — fixtures simulate every failure mode

# Wiring
package.json                                           # MODIFIED — add "check:vehicle-brand-logos" script
turbo.json                                             # MODIFIED — register check:vehicle-brand-logos task (no caching, like check:shared-features)
shared-features.json                                   # MODIFIED — add vehicle-brand-logos to sharedPrimitives

# Attribution
LICENSE-third-party.md                                 # NEW — preserves filippofilip95/car-logos-dataset MIT notice + brand-mark statement

# Tests on each app
apps/web/tests/e2e/
└── vehicle-brand-logos.spec.ts                        # NEW — Playwright; keyboard flow, network listener, console-error listener

apps/desktop/src/test/
└── brand-logo-offline.test.ts                         # NEW — Vitest jsdom integration; disables renderer network, asserts logos render
```

**Structure Decision**: New vertical slice `shared/vehicle-brand-logos/` added to the existing `@ramcar/features` package, following the same layout pattern as the sibling `shared/vehicle-brand-model/` slice from spec 016. The slice owns the asset directory, the slug helper, the registry, the lookup function, and the rendering component, plus their tests. Consumers across `apps/web`, `apps/desktop`, and the existing shared package slices import the component or the lookup function — no per-app duplicate is created. One CI script (`pnpm check:vehicle-brand-logos`) enforces every spec invariant statically. No DB migration, no API endpoint, no shared schema change, no desktop sync change.

## Implementation Phases

### Phase 1: Slice scaffold (lookup + component + tests, no consumers wired yet)

**Goal**: The shared slice exists, compiles, ships green tests, and is importable — without yet touching any consumer.

1. **Create the directory** `packages/features/src/shared/vehicle-brand-logos/` per the structure above.
2. **Author `slugify.ts`** per data-model §3.1. Add `slugify.test.ts` covering I-S1–I-S4 (and a parameterized test that runs every key in `VEHICLE_BRAND_MODEL` through `slugify` and asserts the resulting set is unique — this is the future-proofing assertion).
3. **Author `svg.d.ts`** with the ambient module declaration so SVG default-imports are typed as `string` (the URL).
4. **Drop in 20 SVG assets** under `assets/`. Each filename = `slugify(canonicalName)` for the matching brand in `VEHICLE_BRAND_MODEL`. Source: `filippofilip95/car-logos-dataset`'s optimized SVG path. For "Chirey" → use the Chery mark from upstream (same manufacturer, same logo).
5. **Author `logo-registry.ts`** per `contracts/logo-registry.contract.ts` — alphabetical, one static `import x from "./assets/<slug>.svg";` per brand. Add `logo-registry.test.ts` covering R1–R5.
6. **Author `get-brand-logo-url.ts`** per `contracts/get-brand-logo-url.contract.ts`. Build the normalized index once at module load. Add `get-brand-logo-url.test.ts` covering B1–B8 and `get-brand-logo-url.bench.ts` for the micro-benchmark.
7. **Author `vehicle-brand-logo.tsx`** per `contracts/vehicle-brand-logo.contract.tsx`. Add `vehicle-brand-logo.test.tsx` covering V1–V10 and a small `expect.toMatchInlineSnapshot()` for the rendered tile dimensions across known and unknown brand cases (V4).
8. **Author `index.ts`** barrel re-exporting `VehicleBrandLogo`, `VehicleBrandLogoProps`, `VehicleBrandLogoSize`, `getBrandLogoUrl`, and `BRAND_LOGO_REGISTRY`.
9. **Wire package exports** — append `"./shared/vehicle-brand-logos": "./src/shared/vehicle-brand-logos/index.ts"` to `packages/features/package.json` `exports`. Re-export the component and lookup from `packages/features/src/shared/index.ts` so existing `@ramcar/features/shared` consumers can use it without an import path change.

**Verification**: `pnpm --filter @ramcar/features typecheck` clean. `pnpm --filter @ramcar/features test` green (new tests pass; nothing pre-existing breaks).

### Phase 2: CI orphan-check script + budget + attribution

**Goal**: SC-001, SC-007, SC-009, SC-010 are enforced by automation, not human reviewers.

1. **Author `scripts/check-vehicle-brand-logos.ts`** implementing C1…C7 from `contracts/ci-orphan-check.contract.md`. Use `@typescript-eslint/typescript-estree` (or a plain regex-based key extractor — both work; keep whichever is simpler) to read `data.ts` and `logo-registry.ts` keys; use `node:fs` for file walks and size sums; print every violation, exit non-zero on any.
2. **Author `scripts/__tests__/check-vehicle-brand-logos.test.ts`** with fixture trees for each failure mode (orphan, missing, abandoned file, corrupted SVG, oversized budget, missing attribution, slug collision). Use `tmp-promise` (already a transitive dep) or `node:fs.mkdtemp` for fixture isolation.
3. **Wire `package.json` script** — add `"check:vehicle-brand-logos": "tsx scripts/check-vehicle-brand-logos.ts"` (use whichever runner the existing `scripts/check-shared-features.ts` uses; verify and match for consistency).
4. **Wire `turbo.json` task** — register `check:vehicle-brand-logos` mirroring `check:shared-features` (no cache, no outputs).
5. **Create `LICENSE-third-party.md`** at repo root with the attribution wording from research §11. Run the orphan check locally and confirm it passes.

**Verification**: `pnpm check:vehicle-brand-logos` exits `0` with the green output. Intentionally introduce a missing logo (rename one SVG temporarily) — the script exits `1` with the C1 message. Revert.

### Phase 3: Brand picker integration (User Story 1 — P1)

**Goal**: The brand autocomplete shows logos in suggestion rows AND in the committed-value trigger. Spec §"User Story 1" acceptance scenarios pass.

1. **Edit** `packages/features/src/shared/vehicle-brand-model/vehicle-brand-select.tsx`:
   - Import `VehicleBrandLogo` from `../vehicle-brand-logos`.
   - Inside the `PopoverTrigger` button, render `<VehicleBrandLogo size="sm" brand={value} />` before the `<span>` containing the displayLabel. Wrap both in a `flex items-center gap-2` container so the layout stays aligned whether or not a value is committed (an unknown / placeholder tile still occupies the same width).
   - Inside each `CommandItem` for known brands, render `<VehicleBrandLogo size="sm" brand={brand} />` before the `<span className="truncate">{brand}</span>`. Add the same `flex items-center gap-2` row container.
   - Do NOT render a logo on the `__add_custom__` row (free-text fallback is by definition unknown).
2. **Update `vehicle-brand-select.test.tsx`** to assert: known-brand suggestion rows render an `<img>` next to the brand text; the trigger button renders an `<img>` after a known brand is committed; the trigger renders the placeholder tile when no brand is committed; the `__add_custom__` row renders no `<img>`.

**Verification**: `pnpm --filter @ramcar/features test` green. Manual run in `apps/web` and `apps/desktop` confirms acceptance scenarios 1–4 of User Story 1.

### Phase 4: Read-side surface adoption (User Story 2 — P2 + User Story 3 degradation)

**Goal**: Every surface listed in spec §"Surfaces in scope" renders the logo, with placeholder rows aligning vertically.

1. **`vehicle-manage-list.tsx`** (shared) — wrap the bare `<span>{formatVehicleLabel(v)}</span>` in a `flex items-center gap-2` row that prefixes `<VehicleBrandLogo brand={v.brand} />`. Same change at the `pendingDelete.label` rendering site if applicable.
2. **`visit-person-access-event-form.tsx`** (visitors slice) — both `<span>{formatVehicleLabel(v)}</span>` sites (lines 44 and 49 in the current file) get the same flex-row treatment.
3. **`apps/web/src/features/logbook/components/visitors-columns.tsx`** — the existing `formatVehicleSummary(item)` function returns a string used as a table cell. Convert the column's `cell` renderer to a small JSX component that renders `<VehicleBrandLogo brand={item.vehicle.brand ?? null} />` next to the `${plate} — ${brand}` text. Apply the same change to `providers-columns.tsx` and `residents-columns.tsx`.
4. **Resident & visitor profile vehicle cards** — `grep` for `(vehicle\.|v\.)brand` in `apps/web/src/features/{residents,visitors,providers}` and `apps/desktop/src/features/{residents,visitors,providers}` and wrap each render site in the flex-row pattern. Each touch is 2–3 lines.
5. **Add a Vitest integration test** in the `vehicle-manage-list` neighborhood that creates two vehicles in fixture state (one known brand, one free-text "Made-Up Brand") and asserts: the known-brand row renders an `<img>`, the free-text row renders no `<img>`, both rows have identical computed dimensions for the brand cell (V4 / SC-006).
6. **Adopt for desktop**: the only desktop-exclusive surfaces with a brand string are inside the renderer; they all live in `apps/desktop/src/features/`. Apply the same flex-row pattern. No desktop main-process change is needed (logos are renderer-only assets).

**Verification**: `pnpm --filter @ramcar/features test`, `pnpm --filter @ramcar/web typecheck`, `pnpm --filter @ramcar/desktop typecheck` all green. Manual run confirms each surface shows logos and degrades cleanly for free-text brands.

### Phase 5: E2E + offline + non-regression coverage

**Goal**: Every spec success criterion has automated coverage.

1. **Web Playwright** — add `apps/web/tests/e2e/vehicle-brand-logos.spec.ts`:
   - Open the vehicle form, exercise the brand picker, save a known-brand vehicle, open the vehicle list, open the logbook table.
   - Network listener assertion: the only `.svg` URLs requested are local Next.js static-asset URLs (`/_next/static/media/...svg`). Zero external hosts. (SC-002.)
   - Console-error listener: zero broken-image / 404 errors for the duration of the run. (SC-004.)
   - Add a free-text fallback row, navigate to its list, confirm the placeholder tile renders and the row aligns vertically with a known-brand row. (User Story 3 acceptance scenario 2.)
2. **Desktop integration** — `apps/desktop/src/test/brand-logo-offline.test.ts` (Vitest + jsdom + the existing renderer-test harness): mount the brand picker, simulate "offline" by stubbing global `fetch` to throw, assert the picker still renders all 20 brand logos. (SC-005.)
3. **Shared-features manifest** — add an entry under `sharedPrimitives` in `shared-features.json`:
   ```json
   {
     "name": "vehicle-brand-logos",
     "package": "@ramcar/features/shared/vehicle-brand-logos",
     "addedAt": "2026-04-28",
     "notes": "Spec 022. <VehicleBrandLogo /> + getBrandLogoUrl + frozen registry over 20 bundled SVGs. Zero runtime I/O."
   }
   ```
   `pnpm check:shared-features` automatically picks this up. (SC-008.)
4. **Visual snapshot** — covered by `vehicle-brand-logo.test.tsx` (V4 inline-snapshot of computed dimensions) plus the integration test in Phase 4 step 5. SC-006 satisfied.
5. **Bench** — `get-brand-logo-url.bench.ts` asserts the lookup stays under the 1 ms p95 budget. The existing brand-search benchmark in spec 016 still covers SC-003 for the picker-render path.

**Verification**: `pnpm test`, `pnpm test:e2e`, `pnpm check:shared-features`, `pnpm check:vehicle-brand-logos` all green from a fresh `pnpm install`.

## Constitution Check (post-design)

Re-verified after completing `research.md`, `data-model.md`, `contracts/*`, and `quickstart.md`. No design decision introduced a new principle violation.

| Principle | Post-design status |
|---|---|
| I. Multi-Tenant Isolation | **PASS**. No DB read/write added. The render path consumes the existing `vehicle.brand` field only. |
| II. Feature-Based Architecture | **PASS**. All new UI + logic lives inside a single `shared/vehicle-brand-logos/` slice of `@ramcar/features`. |
| III. Strict Import Boundaries | **PASS**. The new slice imports only from sibling shared modules and `@ramcar/ui`; no `next/*`, no `window.electron`, no Node APIs. The `*.svg` ambient module declaration does not introduce a code-level import. |
| IV. Offline-First Desktop | **PASS**. Bundled static SVGs; zero runtime fetch. Asserted by the desktop offline integration test and the Playwright network listener. |
| V. Shared Validation via Zod | **PASS**. No new payloads to validate. Unchanged. |
| VI. Role-Based Access Control | **PASS**. No new endpoints, no new role-conditional UI. Logos display identically for all roles wherever brand text already displays. |
| VII. TypeScript Strict Mode | **PASS**. `BRAND_LOGO_REGISTRY` typed `Readonly<Record<string, string>>`; `getBrandLogoUrl` returns `string \| null`; `VehicleBrandLogoProps` fully typed; no `any`. |
| VIII. API-First Data Access | **PASS**. No `supabase.from()`, `.rpc()`, `.storage` is added. Bundled SVGs are application assets, in the same category as `lucide-react` icons or shadcn primitives — not a database operation. |

## Complexity Tracking

No constitution violations to justify. This table is intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none)    | (none)     | (none)                              |
