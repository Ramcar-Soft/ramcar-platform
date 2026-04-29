---

description: "Tasks for feature 022 — Vehicle Brand Logos"
---

# Tasks: Vehicle Brand Logos

**Input**: Design documents from `/specs/022-vehicle-brand-logos/`
**Prerequisites**: plan.md (✓), spec.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓), quickstart.md (✓)

**Tests**: Tests are REQUIRED for this feature. The spec defines 10 success criteria (SC-001 → SC-010), each requiring automated coverage (Vitest unit, Vitest integration, Playwright E2E, micro-benchmark, CI script). Test tasks are included throughout.

**Organization**: Tasks are grouped by user story (P1: brand picker, P2: read-side surfaces, P2: free-text degradation) so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1 = brand picker, US2 = read-side surfaces, US3 = free-text fallback rendering)
- File paths are absolute repo-relative

## Path Conventions

- Shared module: `packages/features/src/shared/vehicle-brand-logos/`
- Web consumers: `apps/web/src/features/`
- Desktop consumers: `apps/desktop/src/features/`
- CI script: `scripts/check-vehicle-brand-logos.ts`
- Attribution: repo root `LICENSE-third-party.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the slice directory, the SVG type declaration, and the package-export wiring so Phase 2 work can compile.

- [X] T001 Create directory `packages/features/src/shared/vehicle-brand-logos/` and its `assets/` subdirectory (mkdir only — no files yet)
- [X] T002 [P] Create `packages/features/src/shared/vehicle-brand-logos/svg.d.ts` with ambient module declaration `declare module "*.svg" { const url: string; export default url; }` so TypeScript strict mode accepts the asset imports
- [X] T003 [P] Add package export entry `"./shared/vehicle-brand-logos": "./src/shared/vehicle-brand-logos/index.ts"` to `packages/features/package.json` `exports` field
- [X] T004 Re-export `VehicleBrandLogo` and `getBrandLogoUrl` from `packages/features/src/shared/index.ts` (append `export { VehicleBrandLogo, getBrandLogoUrl } from "./vehicle-brand-logos";`) — these symbols don't exist yet but the export wiring is set up so consumers can later import from `@ramcar/features/shared`

**Checkpoint**: `pnpm --filter @ramcar/features typecheck` will fail with "missing module" (expected — implementation comes in Phase 2). The wiring is in place.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the core slice — slug helper, registry, lookup function, rendering component — plus their unit tests. Every downstream user-story phase depends on this.

**⚠️ CRITICAL**: No user-story phase (Phase 3+) can begin until this phase is complete and `pnpm --filter @ramcar/features test` is green.

### Slug helper

- [X] T005 [P] Implement `slugify(canonicalName: string): string` per data-model §3.1 in `packages/features/src/shared/vehicle-brand-logos/slugify.ts` (NFD-normalize → strip combining marks → lowercase → replace non-alphanumeric runs with single `-` → trim leading/trailing `-`)
- [X] T006 [P] Write `packages/features/src/shared/vehicle-brand-logos/slugify.test.ts` covering invariants I-S1 (determinism), I-S2 (`/^[a-z0-9-]+$/`), I-S3 (no leading/trailing hyphen), I-S4 (parameterized: every key in `VEHICLE_BRAND_MODEL` produces a unique slug — `Set` cardinality === key count)

### Bundled SVG assets

- [X] T007 [P] Source 20 brand SVGs from `filippofilip95/car-logos-dataset` (MIT) and commit them under `packages/features/src/shared/vehicle-brand-logos/assets/` with filenames matching `slugify(canonicalName)`: `byd.svg`, `chevrolet.svg`, `chirey.svg` (use Chery mark from upstream — same manufacturer), `ford.svg`, `gmc.svg`, `honda.svg`, `hyundai.svg`, `jac.svg`, `jeep.svg`, `kia.svg`, `mazda.svg`, `mg.svg`, `nissan.svg`, `peugeot.svg`, `ram.svg`, `renault.svg`, `seat.svg`, `subaru.svg`, `toyota.svg`, `volkswagen.svg`. Each file must be ≥ 32 bytes, start with `<svg`, and total directory size ≤ 500 KB

### Registry

- [X] T008 Implement `BRAND_LOGO_REGISTRY` in `packages/features/src/shared/vehicle-brand-logos/logo-registry.ts` per `contracts/logo-registry.contract.ts`: 20 alphabetical static `import xLogo from "./assets/<slug>.svg"` statements, then `Object.freeze({...})` typed `Readonly<Record<string, string>>`. Depends on T005 (slug naming) and T007 (assets exist on disk)
- [X] T009 Write `packages/features/src/shared/vehicle-brand-logos/logo-registry.test.ts` covering invariants R1 (`Object.isFrozen` true), R2 (every `VEHICLE_BRAND_MODEL` key has a non-empty registry value), R3 (every registry key is in `VEHICLE_BRAND_MODEL`), R4 (alphabetical ordering via `Intl.Collator`), R5 (cardinality of values set === keys count — no shared URL)

### Lookup function

- [X] T010 Implement `getBrandLogoUrl(brand: string | null | undefined): string | null` in `packages/features/src/shared/vehicle-brand-logos/get-brand-logo-url.ts` per `contracts/get-brand-logo-url.contract.ts` — build a `Map<string, string>` index once at module load by normalizing each `BRAND_LOGO_REGISTRY` key via `normalizeForSearch` (imported from `../vehicle-brand-model/search`), then `_normalizedIndex.get(normalizeForSearch(brand)) ?? null` at call time. Depends on T008
- [X] T011 [P] Write `packages/features/src/shared/vehicle-brand-logos/get-brand-logo-url.test.ts` covering behaviors B1 (canonical match returns string), B2 (case-insensitive — "NISSAN" === "Nissan"), B3 (whitespace trim — "  Nissan  " === "Nissan"), B4 (diacritic strip — "Séat" === "SEAT"), B5 ("Made-Up Brand" → null), B6 (null/undefined/""/"   " all → null), B7 (stable identity — same call returns same string `===`), B8 (no I/O — guard with `vi.fn()` over `fetch`/`XMLHttpRequest` to assert zero calls)
- [X] T012 [P] Write micro-benchmark `packages/features/src/shared/vehicle-brand-logos/get-brand-logo-url.bench.ts` asserting p95 < 1 ms over 10 000 lookups across the 20 known brands and 20 random unknown strings — backs SC-003 parity claim

### Rendering component

- [X] T013 Implement `<VehicleBrandLogo brand size? className? />` in `packages/features/src/shared/vehicle-brand-logos/vehicle-brand-logo.tsx` per `contracts/vehicle-brand-logo.contract.tsx` — known brand renders `<span aria-hidden="true" class="flex-none rounded bg-white dark:bg-zinc-100 inline-flex items-center justify-center [w-4 h-4 | w-6 h-6]"><img src={url} alt="" class="object-contain" /></span>`; unknown brand renders the same `<span>` with `bg-muted/40` and NO inner `<img>`. Default `size="sm"`. Use `cn` from `@ramcar/ui`. Depends on T010
- [X] T014 [P] Write `packages/features/src/shared/vehicle-brand-logos/vehicle-brand-logo.test.tsx` covering V1 (known brand → `<img>` with resolved URL, `aria-hidden="true"`, `alt=""`), V2 (unknown brand → `<span role="presentation">`, zero `<img>` count), V3 (null/undefined/""/"   " all render placeholder), V4 (`expect.toMatchInlineSnapshot()` of computed `getBoundingClientRect`-equivalent class attributes — `w-4 h-4` for `sm`, `w-6 h-6` for `md`, identical between known and unknown), V5 (theme tile classes present), V6 (zero `<img>` count when brand is unknown — protects against 404), V7 (default size === "sm"), V8 (className composition — base classes plus consumer's), V9 (mount issues zero fetch — `vi.spyOn(global, 'fetch')` assert not called), V10 (re-render with same props produces identical DOM)

### Public barrel

- [X] T015 Author `packages/features/src/shared/vehicle-brand-logos/index.ts` re-exporting `VehicleBrandLogo`, `VehicleBrandLogoProps`, `VehicleBrandLogoSize`, `getBrandLogoUrl`, `BRAND_LOGO_REGISTRY`. Depends on T010, T013

### License attribution

- [X] T016 [P] Create `LICENSE-third-party.md` at repo root with the `filippofilip95/car-logos-dataset` MIT notice and the brand-mark statement from research §11 — must contain literal substring `car-logos-dataset` so C7 of the CI script passes

### CI orphan-check script

- [X] T017 Implement `scripts/check-vehicle-brand-logos.ts` per `contracts/ci-orphan-check.contract.md` covering checks C1 (no missing logo for any `VEHICLE_BRAND_MODEL` key), C2 (no orphan registry entries), C3 (no abandoned files in `assets/`), C4 (file sanity — ≥ 32 bytes, starts with `<svg`), C5 (slug uniqueness across `VEHICLE_BRAND_MODEL`), C6 (asset budget ≤ 500 KB total), C7 (`LICENSE-third-party.md` exists at repo root and contains `car-logos-dataset`). Print every violation, exit `0` only if all checks pass. Mirror the runner choice in `scripts/check-shared-features.ts` (likely `tsx`). Depends on T005, T007, T008, T016
- [X] T018 Write `scripts/__tests__/check-vehicle-brand-logos.test.ts` with fixtures for every failure mode: orphan-both-directions, abandoned file, corrupted SVG, slug collision, oversized budget, missing `LICENSE-third-party.md`. Use `node:fs.mkdtemp` for fixture isolation. Confirm exit code `1` and the expected violation message for each
- [X] T019 Add `"check:vehicle-brand-logos": "tsx scripts/check-vehicle-brand-logos.ts"` to root `package.json` scripts; register the task in `turbo.json` mirroring `check:shared-features` (no cache, no outputs). Depends on T017
- [X] T020 Add `vehicle-brand-logos` entry to `shared-features.json` under `sharedPrimitives` with `package: "@ramcar/features/shared/vehicle-brand-logos"`, `addedAt: "2026-04-28"`, and a one-line note referencing spec 022 — picked up by `pnpm check:shared-features` to enforce SC-008 (no per-app duplicate)

**Checkpoint**: Foundation ready. Run `pnpm --filter @ramcar/features typecheck`, `pnpm --filter @ramcar/features test`, `pnpm check:vehicle-brand-logos`, `pnpm check:shared-features` — all must exit `0`. The slice is importable but no consumer renders it yet.

---

## Phase 3: User Story 1 — Brand picker shows logos (Priority: P1) 🎯 MVP

**Goal**: The vehicle brand autocomplete shows a small logo on each known-brand suggestion row AND inside the committed-value trigger after a brand is picked. The free-text fallback row stays without a logo. No layout shift.

**Independent Test** (from spec §"User Story 1"): Open the vehicle form (web or desktop). Type "nis". The Nissan suggestion row shows the Nissan logo to the left of the text. Press Enter — the trigger button still shows the Nissan logo next to "Nissan". Repeat for 5 other Mexico-market brands. No broken images, no layout jumps when the dropdown opens.

### Implementation for User Story 1

- [X] T021 [US1] Edit `packages/features/src/shared/vehicle-brand-model/vehicle-brand-select.tsx` — import `VehicleBrandLogo` from `../vehicle-brand-logos`. Inside the `PopoverTrigger` button, wrap the displayLabel span in a `flex items-center gap-2` container and prefix it with `<VehicleBrandLogo size="sm" brand={value} />`. Inside each `CommandItem` for known brands, prefix the `<span className="truncate">{brand}</span>` with `<VehicleBrandLogo size="sm" brand={brand} />` and wrap both in `flex items-center gap-2`. Do NOT add a logo to the `__add_custom__` (free-text fallback) row
- [X] T022 [US1] Update `packages/features/src/shared/vehicle-brand-model/vehicle-brand-select.test.tsx` to assert: known-brand suggestion rows render an `<img>` next to the brand text; the trigger button renders an `<img>` after a known brand is committed; the trigger renders the placeholder tile when no brand is committed; the `__add_custom__` row renders no `<img>`

**Checkpoint**: User Story 1 fully functional. `pnpm --filter @ramcar/features test` green. Manual test in `apps/web` and `apps/desktop`: all four acceptance scenarios pass.

---

## Phase 4: User Story 2 — Read-side surfaces show logos (Priority: P2)

**Goal**: Every read-only surface that already prints a vehicle brand text — vehicle lists, vehicle cards in resident/visitor profiles, vehicle detail views, the access-log/bitácora vehicle cell — also shows the brand logo adjacent to the text. Identical asset and dimensions in `apps/web` and `apps/desktop`.

**Independent Test** (from spec §"User Story 2"): Navigate to a vehicle list (resident vehicles, visitor vehicles, or the access-log/bitácora table). The brand column or vehicle cell shows the brand logo + brand text together. Open the same vehicle in web and desktop — same asset, same dimensions.

### Shared package consumers

- [X] T023 [US2] Edit `packages/features/src/shared/vehicle-form/vehicle-manage-list.tsx` — wrap `<span className="truncate">{formatVehicleLabel(v)}</span>` in a flex row that prefixes `<VehicleBrandLogo brand={v.brand} />` (and apply the same change to the `pendingDelete.label` rendering site if it prints brand text). Import `VehicleBrandLogo` from `@ramcar/features/shared`
- [X] T024 [US2] Edit `packages/features/src/visitors/components/visit-person-access-event-form.tsx` — both `<span>{formatVehicleLabel(v)}</span>` sites (around lines 44 and 49 per plan §Scale/Scope) get the flex-row + `<VehicleBrandLogo brand={v.brand} />` treatment. Import `VehicleBrandLogo` from `@ramcar/features/shared`

### Web logbook columns

- [X] T025 [P] [US2] Edit `apps/web/src/features/logbook/components/visitors-columns.tsx` — convert the column whose `cell` currently calls `formatVehicleSummary(item)` (string return) to render a small JSX cell: `<span className="flex items-center gap-2"><VehicleBrandLogo brand={item.vehicle?.brand ?? null} /><span>{plate && brand ? `${plate} — ${brand}` : (plate ?? brand ?? "")}</span></span>`. Import `VehicleBrandLogo` from `@ramcar/features/shared`
- [X] T026 [P] [US2] Same change in `apps/web/src/features/logbook/components/providers-columns.tsx`
- [X] T027 [P] [US2] Same change in `apps/web/src/features/logbook/components/residents-columns.tsx`

### Vehicle detail / cards (web + desktop)

- [X] T028 [US2] Run `grep -rn "(vehicle\\.|v\\.)brand" apps/web/src/features/{residents,visitors,providers}/` and at every render site that prints the brand as text, wrap in flex-row with `<VehicleBrandLogo brand={...} />`. Each touch is 2-3 lines. Import `VehicleBrandLogo` from `@ramcar/features/shared`
- [X] T029 [US2] Run `grep -rn "(vehicle\\.|v\\.)brand" apps/desktop/src/features/{residents,visitors,providers}/` and apply the same flex-row + `<VehicleBrandLogo />` adoption at every render site. Renderer-only — no main-process change. Import `VehicleBrandLogo` from `@ramcar/features/shared`

### Verification test

- [X] T030 [US2] Add a Vitest integration test in `packages/features/src/shared/vehicle-form/vehicle-manage-list.test.tsx` (create the file if missing — pattern after sibling tests) that mounts `<VehicleManageList />` with two fixture vehicles (one known brand "Nissan", one free-text "Made-Up Brand") and asserts: known-brand row renders an `<img>` element, free-text row renders zero `<img>`, both rows have identical computed dimensions for the brand cell (V4 / SC-006)

**Checkpoint**: User Story 2 fully functional. `pnpm --filter @ramcar/features test`, `pnpm --filter @ramcar/web typecheck`, `pnpm --filter @ramcar/desktop typecheck` all green. Manual run shows logos on every named surface in web and desktop.

---

## Phase 5: User Story 3 — Free-text / unknown brand degrades cleanly (Priority: P2)

**Goal**: A vehicle saved through spec 016's free-text fallback shows brand text only (or a neutral placeholder tile that occupies the same dimensions) — no broken-image icon, no console error. Row alignment is identical to known-brand rows, even when mixed in the same list.

**Independent Test** (from spec §"User Story 3"): Save a vehicle using "Use '<typed text>'" fallback. View it in (a) the brand picker when re-editing, (b) any vehicle list. The brand field/row shows the typed text without a broken image; row vertical alignment matches a known-brand row above/below it. Saving "TOYOTA " (whitespace, uppercase) renders the Toyota logo (normalization parity with the brand picker).

> **Note**: All component-level rendering for unknown brands is already covered by the placeholder branch implemented in T013 (`<VehicleBrandLogo />`) and asserted by V2/V3/V4/V6 in T014. The work in this phase is end-to-end coverage that the rendering holds across actual user-saved free-text vehicles in the live consumer surfaces.

### Tests for User Story 3

- [X] T031 [P] [US3] In `packages/features/src/shared/vehicle-brand-model/vehicle-brand-select.test.tsx` (already touched by T022), add a case that simulates re-editing a vehicle whose stored brand is `"Made-Up Brand"`: the trigger button renders the placeholder tile (no `<img>`); the suggestion popover does NOT show a logo on the `__add_custom__` row
- [X] T032 [P] [US3] In the integration test added by T030, add a third assertion: a free-text row whose stored value normalizes to a known brand (e.g., `"  TOYOTA  "`) renders the Toyota `<img>` (B3+B4 parity at the consumer level — User Story 3 acceptance scenario 3)
- [X] T033 [US3] Confirm no console error or broken-image network event fires for free-text rows in the Playwright e2e (covered by T035 below — this entry is a checklist line, not a separate test)

**Checkpoint**: User Stories 1, 2, 3 all functional and independently verified. Mixed lists of known-brand + free-text rows render cleanly with identical row heights.

---

## Phase 6: End-to-end + offline + non-regression coverage

**Purpose**: Lock in every measurable success criterion (SC-001 → SC-010) with automated coverage that runs in CI.

### Web E2E

- [X] T034 Add `apps/web/tests/e2e/vehicle-brand-logos.spec.ts` Playwright spec that:
  - Logs in as Admin/Guard, navigates to a Resident's vehicles tab, opens the vehicle form
  - Types "nis", commits Nissan, saves the vehicle, returns to the list
  - Adds a second vehicle via free-text fallback ("Made-Up Brand"), saves
  - Opens the logbook table
  - Network listener: asserts every `.svg` request URL is local (`/_next/static/media/`); zero requests to `raw.githubusercontent.com`, `cdn.*`, or any external host (SC-002)
  - Console-error listener: asserts zero broken-image / 404 messages for the run (SC-004)
  - Visual: free-text row's brand cell has the same computed `offsetHeight` as the Nissan row above/below it (User Story 3 acceptance scenario 2)

### Desktop offline

- [X] T035 Add `apps/desktop/src/test/brand-logo-offline.test.ts` Vitest + jsdom integration test that:
  - Mounts the brand picker via the existing renderer-test harness
  - Stubs global `fetch` and `XMLHttpRequest` to throw on any call (simulating offline)
  - Asserts all 20 brand suggestion rows render an `<img>` whose `src` is a local Vite-emitted URL (`/assets/...svg` or equivalent — no external host)
  - Asserts zero thrown fetches occurred (SC-005)

### Final integration

- [X] T036 Run the full quality gate: `pnpm typecheck && pnpm lint && pnpm test && pnpm check:shared-features && pnpm check:vehicle-brand-logos && pnpm --filter @ramcar/web test:e2e -- vehicle-brand-logos`. All must exit `0`. Resolve any failure before claiming the feature complete

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T037 [P] Wire the third-party attribution string into the About surface of `apps/web` if an existing About / Acknowledgements page is present (search for `app-version` render site). If no About page exists, defer with a TODO — `LICENSE-third-party.md` presence already satisfies SC-009 for this iteration (covered by T016 + T017 C7)
- [X] T038 [P] Same wire-up in `apps/desktop` — add the attribution line to the existing About modal if present; otherwise defer with the same TODO note
- [X] T039 Manual SC-010 dry-run: on a throwaway branch, intentionally rename one SVG (e.g., `nissan.svg` → `nissan.bak.svg`) and run `pnpm check:vehicle-brand-logos` — confirm exit code `1` and the C1 "Missing logo for brand 'Nissan'" message. Revert the change. Documents the gate works in CI before merge
- [X] T040 Walk the quickstart.md verification checklist (Tasks 6 + 7 + 8): `apps/web` dev server flow, `apps/desktop` dev flow with offline toggle, dark-mode legibility check, DevTools Network filter for `.svg` showing only local URLs

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1. **BLOCKS** all user stories.
  - Within Phase 2: T005, T006, T007, T016 are independent (parallelizable). T008 needs T005 + T007. T009 needs T008. T010 needs T008. T011, T012 need T010. T013 needs T010. T014 needs T013. T015 needs T010 + T013. T017 needs T005 + T007 + T008 + T016. T018 needs T017. T019 needs T017. T020 stands alone.
- **Phase 3 (US1)**: Depends on Phase 2 complete (specifically T013 + T015).
- **Phase 4 (US2)**: Depends on Phase 2 complete. Independent of Phase 3 — can run in parallel with US1 if staffed.
- **Phase 5 (US3)**: Depends on Phase 2 complete (placeholder rendering is in T013/T014). Tests in this phase depend on T022 (US1 tests file) and T030 (US2 integration test file).
- **Phase 6 (E2E + offline)**: Depends on US1 + US2 + US3 implementation done.
- **Phase 7 (Polish)**: Depends on the rest.

### User Story Dependencies

- **US1 (Brand picker, P1, MVP)**: Self-contained after Phase 2. Touches only `vehicle-brand-select.tsx` and its test.
- **US2 (Read-side surfaces, P2)**: Independent of US1. Different files. Can ship in same release or separate.
- **US3 (Free-text degradation, P2)**: Logically a property of US1 + US2 (the placeholder branch). Implementation is shared (T013); the work in Phase 5 is verification across surfaces.

### Within Each User Story

- Component implementation before integration test
- Integration test after the consumer surfaces it asserts have been wired
- Story complete before moving to the next priority

### Parallel Opportunities

**Phase 2 parallelism** (after T001 mkdir):
- `[T002, T003, T004]` package wiring — three different files
- `[T005, T006, T007, T016]` slug/test/assets/license — independent
- `[T011, T012]` after T010 — different test files
- `[T014]` after T013
- `[T017]` blocks on T005/T007/T008/T016, then `[T018, T019]` depend on T017 sequentially-ish (T019 only needs T017's existence; T018 tests it)

**Phase 4 parallelism** (after Phase 2):
- `[T025, T026, T027]` web logbook columns — three different files
- `[T028, T029]` web vs desktop profile-card grep adoption — different file trees

**Phase 5 parallelism**:
- `[T031, T032]` — different existing test files

**Phase 7 parallelism**:
- `[T037, T038]` — web vs desktop About surface wire-up

**Phase-level parallelism**: After Phase 2 completes, US1 (Phase 3) and US2 (Phase 4) can be worked by two people in parallel — they touch disjoint files (`vehicle-brand-select.tsx` vs the read-side surface set). US3 (Phase 5) depends on both for its integration tests.

---

## Parallel Example: Phase 2 — Foundational (after T001 mkdir)

```bash
# Wave 1 — independent leaf tasks (4 in parallel):
Task: "T002 SVG ambient module declaration in svg.d.ts"
Task: "T005 slugify() in slugify.ts"
Task: "T007 Drop in 20 SVG assets under assets/"
Task: "T016 LICENSE-third-party.md at repo root"

# Wave 2 — tests on the leaf modules (in parallel):
Task: "T006 slugify.test.ts"
Task: "T003 + T004 package.json export entry + shared/index.ts re-export"

# Wave 3 — registry + lookup chain (sequential):
Task: "T008 logo-registry.ts (depends on T005 + T007)"
→ Task: "T009 logo-registry.test.ts"
→ Task: "T010 get-brand-logo-url.ts"
→ "T011 get-brand-logo-url.test.ts" + "T012 get-brand-logo-url.bench.ts" (parallel)

# Wave 4 — component + barrel:
Task: "T013 vehicle-brand-logo.tsx (depends on T010)"
→ "T014 vehicle-brand-logo.test.tsx" + "T015 index.ts barrel" (parallel)

# Wave 5 — CI script + wiring (mostly parallel after T017):
Task: "T017 scripts/check-vehicle-brand-logos.ts"
→ "T018 script tests" + "T019 package.json + turbo.json wiring" (parallel)

# Independent throughout: T020 shared-features.json entry
```

## Parallel Example: Phase 4 — Read-side surface adoption

```bash
# Web logbook columns — three independent files:
Task: "T025 visitors-columns.tsx"
Task: "T026 providers-columns.tsx"
Task: "T027 residents-columns.tsx"

# Profile-card grep adoption — disjoint trees:
Task: "T028 apps/web grep + adoption"
Task: "T029 apps/desktop grep + adoption"
```

---

## Implementation Strategy

### MVP (US1 only)

1. Phase 1: Setup (T001-T004).
2. Phase 2: Foundational (T005-T020) — 16 tasks.
3. Phase 3: User Story 1 (T021-T022) — 2 tasks.
4. **STOP and validate**: Open the brand picker in web and desktop. Confirm acceptance scenarios 1-4 of User Story 1 pass.
5. Demo / merge if ready.

### Incremental delivery

1. MVP → US1 (brand picker logos).
2. Add US2 → Read-side surfaces light up everywhere (T023-T030). Demo.
3. Add US3 → Free-text rows verified clean across surfaces (T031-T033). Demo.
4. Phase 6 → CI gates locked (T034-T036). Demo or merge.
5. Phase 7 → Attribution surfaces + manual SC-010 dry run (T037-T040).

### Parallel team strategy

- Engineer A: Phase 2 foundational stack (T005-T015).
- Engineer B: Phase 2 CI script + attribution (T016-T020) once T005 + T007 land.
- After Phase 2 checkpoint:
  - Engineer A: US1 (T021-T022) → US3 verification (T031-T033).
  - Engineer B: US2 (T023-T030).
  - Engineer C (optional): Phase 6 E2E (T034) + desktop offline (T035) once US1 + US2 land.

---

## Notes

- This feature has NO database migration, NO new API endpoint, NO new Zod schema, NO new desktop SQLite column. Every task is presentation-layer.
- All new component code lives in `@ramcar/features` (one shared slice). Per-app duplication is rejected by `pnpm check:shared-features` (T020 registers the slice in the manifest so the check enforces it).
- Asset budget is a hard cap (500 KB total under `assets/`); the CI script in T017 fails the build on overage.
- `[P]` tasks operate on different files with no shared state.
- `[Story]` label maps a task to the user story it serves so the team can deliver phase-by-phase.
- Verify each test FAILS before its implementation lands (TDD-style for the unit tests in Phase 2).
- Commit after each task or logical group. Do NOT commit/push without explicit user instruction (per CLAUDE.md "Git Rules").
- Stop at any checkpoint and validate the user story end-to-end before moving on.
- Avoid adding logos to PDFs, exports, email notifications, or the mobile app — all explicitly out of scope per spec §"Surfaces in scope".
