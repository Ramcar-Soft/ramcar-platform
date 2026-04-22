# Tasks: Vehicle Brand & Model Autocomplete (Mexico Market)

**Input**: Design documents from `/specs/016-vehicle-brand-model-autocomplete/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md, contracts/

**Tests**: Included. plan.md explicitly names Vitest component tests, a microbenchmark (SC-003), an API Jest extension, a web Playwright E2E (SC-004, SC-005), a desktop offline integration test (SC-006), and a translation-key audit (SC-007). Research §12 dedicates a "Tests & benchmarks" section. All test tasks below map back to those commitments.

**Organization**: Tasks are grouped by user story (US1, US2, US3, US4) so each story can be implemented and validated independently. US1 is the MVP — US2 is the required P1 companion (free-text fallback) without which unknown vehicles cannot be saved.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- All paths are absolute from the monorepo root

## Path Conventions

- **Shared feature slice**: `packages/features/src/shared/vehicle-brand-model/`
- **Shared form (existing, edited)**: `packages/features/src/shared/vehicle-form/vehicle-form.tsx`
- **Shared Zod schemas**: `packages/shared/src/validators/vehicle.ts`
- **Shared types**: `packages/shared/src/types/vehicle.ts`
- **Shared i18n catalogs**: `packages/i18n/src/messages/{en,es}.json`
- **API repository**: `apps/api/src/modules/vehicles/vehicles.repository.ts`
- **DB migration**: `supabase/migrations/{timestamp}_add_year_to_vehicles.sql`
- **Web E2E**: `apps/web/tests/e2e/vehicle-form.spec.ts`
- **Web draft-persistence call site**: `apps/web/src/features/residents/`
- **Shared-features manifest**: `shared-features.json` (repo root)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the new dependency and scaffold the feature slice directory so subsequent phases can drop files into a known layout.

- [X] T001 Add `fuse.js` as a top-level dependency to `packages/features/package.json` (runtime dep, not dev) and run `pnpm install` from the repo root to update the lockfile
- [X] T002 [P] Create the new slice directory and empty public barrel at `packages/features/src/shared/vehicle-brand-model/index.ts` (contents will be filled as exports land in later phases)
- [X] T003 Add a re-export line for `./vehicle-brand-model` in `packages/features/src/shared/index.ts` so the slice is reachable via `@ramcar/features/shared`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The static dataset, the search helpers, and the i18n keys must all exist before any component can be authored or tested. Every user story (US1, US2, US3) except US4 (year-only) consumes these directly; US4 uses the same i18n catalog.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Create the canonical Mexico-market dataset at `packages/features/src/shared/vehicle-brand-model/data.ts` — export `VEHICLE_BRAND_MODEL` typed as `Readonly<Record<string, readonly string[]>>`, frozen with `Object.freeze`, covering ~25–35 brands × 10–20 models per research.md §2 sourcing plan (AMDA, INEGI, manufacturer Mexico sites). Canonical spellings per contracts/dataset-schema.contract.ts spelling policy (Mexico-market marketing name, no trim suffixes)
- [X] T005 [P] Create dataset invariant tests at `packages/features/src/shared/vehicle-brand-model/data.test.ts` covering I-D1 through I-D6 from data-model.md §1: no duplicate brand keys, every brand has ≥1 model, no duplicate models within a brand (case-insensitive + NFD diacritic-normalized), every name matches `^[A-Za-z0-9][A-Za-z0-9 \-\.]*$`, brand count within 10–100 sanity band, `Object.isFrozen` is true
- [X] T006 Create search helpers at `packages/features/src/shared/vehicle-brand-model/search.ts` — export `normalizeForSearch(s: string)` (trim + lowercase + NFD + strip combining marks), `buildBrandIndex()` (module-memoized Fuse.js instance with threshold 0.3 per research.md §1 and §3), `searchModels(brand: string, query: string)` (hand-rolled: normalize both sides, rank startsWith before includes, cap 10 — NOT fuse.js, per FR-005)
- [X] T007 [P] Create search unit tests at `packages/features/src/shared/vehicle-brand-model/search.test.ts` — cover `normalizeForSearch` (accents, case, whitespace), `buildBrandIndex` (fuzzy tolerates typos: "nisan" → Nissan; "vw" → Volkswagen; threshold 0.3 rejects wildly dissimilar), `searchModels` (startsWith rank, includes fallback, cap 10, empty-on-empty-brand)
- [X] T008 [P] Create brand-search microbenchmark at `packages/features/src/shared/vehicle-brand-model/search.bench.ts` — run `buildBrandIndex().search(query)` N times across representative queries ("n", "nis", "toy", "maz3"), assert p95 < 50 ms against the full dataset on a typical reviewer laptop (SC-003)
- [X] T009 [P] Add the `vehicles.brand.*` and `vehicles.model.*` and `vehicles.common.*` i18n keys to `packages/i18n/src/messages/en.json`: labels, placeholders, `"Use '{typed}'"` fallback row text, disabled-model hint, empty-state text (the exact key inventory is the union of strings referenced by the components in Phases 3–5 and the year labels in Phase 6)
- [X] T010 [P] Mirror T009's key additions in `packages/i18n/src/messages/es.json` with Spanish translations for every new key (SC-007 requires 100% parity)

**Checkpoint**: `pnpm typecheck` passes, `pnpm --filter @ramcar/features test` runs T005/T007/T008 green, `pnpm --filter @ramcar/i18n build` (or equivalent) confirms the JSON loads cleanly. User stories can now begin.

---

## Phase 3: User Story 1 — Select a known vehicle's brand and model (Priority: P1) 🎯 MVP

**Goal**: A guard or admin picks a dataset brand from a fuzzy-search list, the dependent model list unlocks and offers only that brand's models, and the saved vehicle row has canonical spelling.

**Independent Test**: Open the vehicle form on web (or desktop). Type "nis" in brand → pick "Nissan". Model field enables. Type "ver" → pick "Versa". Submit. Confirm the persisted row has `brand="Nissan"`, `model="Versa"` (canonical casing, no trailing whitespace).

### Implementation for User Story 1

- [X] T011 [P] [US1] Implement `VehicleBrandSelect` at `packages/features/src/shared/vehicle-brand-model/vehicle-brand-select.tsx` per `contracts/vehicle-brand-select.contract.ts` — Popover + Command* from `@ramcar/ui`, delegate filtering to the memoized `buildBrandIndex()` from search.ts, cap 10 visible results, commit the canonical brand string on select. **Dataset-only — no fallback row in this phase; US2 adds it.**
- [X] T012 [P] [US1] Implement `VehicleModelSelect` at `packages/features/src/shared/vehicle-brand-model/vehicle-model-select.tsx` per `contracts/vehicle-model-select.contract.ts` — same Popover + Command* shell, `aria-disabled` when `brand === null` (hint references `vehicles.model.disabled`), when `brand` is a dataset key filter via `searchModels`, commit canonical model on select. **Dataset-only — no fallback row in this phase; US2 adds it.**
- [X] T013 [US1] Export `VehicleBrandSelect` and `VehicleModelSelect` from `packages/features/src/shared/vehicle-brand-model/index.ts`
- [X] T014 [US1] Ensure the two components are reachable through `packages/features/src/shared/index.ts` (verify the re-export from T003 surfaces them via `@ramcar/features`)
- [X] T015 [P] [US1] Unit test `VehicleBrandSelect` at `packages/features/src/shared/vehicle-brand-model/vehicle-brand-select.test.tsx` covering behaviors B1 (popover opens on focus), B2 (fuzzy match), B3 ("nis" → Nissan), B4 (commit canonical), B7 (≤10 rows), B8 (prev-value displayed as current selection, including legacy free-text per FR-019), B9 (Enter commits), B10 (ArrowUp/Down traverses)
- [X] T016 [P] [US1] Unit test `VehicleModelSelect` at `packages/features/src/shared/vehicle-brand-model/vehicle-model-select.test.tsx` covering behaviors M1 (disabled-when-brand-null), M2 (scoped to brand — no cross-brand leakage), M3 (startsWith ranked above includes), M4 (commit canonical), M7 (keyboard), M8 (prev-value displayed, legacy round-trip per FR-019)
- [X] T017 [US1] Swap the plain brand and model `<Input>` rows in `packages/features/src/shared/vehicle-form/vehicle-form.tsx` for `<VehicleBrandSelect>` and `<VehicleModelSelect>`; wire the FR-013 and FR-014 rules in the parent's `onChange` handler — when brand changes set model to `null`, when brand is cleared set model to `null` (see quickstart.md Task 2)
- [X] T018 [P] [US1] Add an integration test at `packages/features/src/shared/vehicle-form/vehicle-form.test.tsx` for the VehicleForm happy path: selecting dataset brand + model commits canonical values; changing the brand clears the previously committed model (FR-013); clearing the brand clears and disables the model (FR-014)

**Checkpoint**: Users can pick known brand + model and save a vehicle with canonical spelling. Unknown vehicles cannot yet be saved — US2 adds that and ships together as P1.

---

## Phase 4: User Story 2 — Fall back to free text for a vehicle not in the dataset (Priority: P1)

**Goal**: When the user's typed brand or model is not in the dataset, the suggestion list offers an explicit `"Use '<typed>'"` row whose selection commits the raw text. Unknown vehicles can be saved without leaving the autocomplete UX.

**Independent Test**: Open the form. Type "Gumpert" in brand → see the "Use 'Gumpert'" row → press Enter → brand is "Gumpert", model field becomes a free-text input. Type "Apollo" in model → commit via fallback. Submit. Reopen for edit → both fields display "Gumpert" / "Apollo" as the current selection.

### Implementation for User Story 2

- [X] T019 [US2] Add the synthetic `__add_custom__` "Use '{typed}'" row to `packages/features/src/shared/vehicle-brand-model/vehicle-brand-select.tsx` — always visible when there's typed text that doesn't already match a dataset canonical, mirroring `color-select.tsx` as a structural reference, committing the user's raw text verbatim (behaviors B5, B6)
- [X] T020 [US2] Add the equivalent fallback row to `packages/features/src/shared/vehicle-brand-model/vehicle-model-select.tsx` — same mechanism. Additionally: when the committed `brand` prop is NOT a dataset key (free-text brand), render ONLY the fallback row regardless of typed text (behaviors M5, M6 per FR-008)
- [X] T021 [P] [US2] Extend `packages/features/src/shared/vehicle-brand-model/vehicle-brand-select.test.tsx` with behaviors B5 (unknown text shows fallback row), B6 (selecting fallback commits raw text verbatim), B11 (legacy free-text value renders as current selection on reopen)
- [X] T022 [P] [US2] Extend `packages/features/src/shared/vehicle-brand-model/vehicle-model-select.test.tsx` with behaviors M5 (free-text brand → only fallback row visible), M6 (model fallback commits verbatim), plus a scenario cross-checking FR-019 (a vehicle loaded with a pre-dataset free-text model renders without throwing)
- [X] T023 [US2] Extend `packages/features/src/shared/vehicle-form/vehicle-form.test.tsx` with a scenario: free-text brand + free-text model submit path commits the user's verbatim strings (covers FR-007, FR-008, FR-012)

**Checkpoint**: Unknown vehicles save through the explicit fallback. US1 + US2 together deliver the P1 scope and can ship.

---

## Phase 5: User Story 3 — Keyboard-first selection for fast entry (Priority: P2)

**Goal**: Guard-booth operators can complete brand + model selection without touching a mouse. Arrow keys navigate suggestions, Enter commits, Escape dismisses, and committing a brand auto-shifts focus to the model field.

**Independent Test**: Focus the brand field. Type "toy" → "Toyota" highlighted → Enter → brand set, focus on model. Type "cor" → "Corolla" → Enter → model set, focus moves past the autocomplete pair. No pointer events synthesized.

### Implementation for User Story 3

- [ ] T024 [US3] Add auto-focus-shift behavior to `packages/features/src/shared/vehicle-brand-model/vehicle-brand-select.tsx` — after committing a brand (either dataset selection or fallback), move DOM focus to the model field via a ref passed through props (or via an imperative focus signal documented in the contract). Covers US3 Acceptance Scenario 4
- [ ] T025 [P] [US3] Extend keyboard-navigation coverage in `packages/features/src/shared/vehicle-brand-model/vehicle-brand-select.test.tsx` for US3 Acceptance Scenarios 1–4: ArrowDown/ArrowUp moves focus with wrap, Enter selects, Escape closes without commit, focus transitions to model field after brand commit
- [ ] T026 [P] [US3] Extend keyboard-navigation coverage in `packages/features/src/shared/vehicle-brand-model/vehicle-model-select.test.tsx` for ArrowDown/ArrowUp, Enter, and Escape. cmdk primitive handles most of this; add explicit assertions so regressions fail at the slice level not at the library level
- [ ] T027 [US3] Add a keyboard-only Playwright E2E scenario to `apps/web/tests/e2e/vehicle-form.spec.ts` — drive brand → ArrowDown → Enter, assert focus on model input, type model text → Enter, assert focus on the next control (year or save), and ensure `page.mouse.*` / synthesized pointer events are never called. Covers SC-005

**Checkpoint**: Keyboard-only entry is verified in both component-level tests and web E2E.

---

## Phase 6: User Story 4 — Optional year input with validation (Priority: P2)

**Goal**: Users can optionally record a four-digit year. The field is optional, validates bounds (1960 ≤ year ≤ currentYear+1) via the shared Zod schema, persists through the API to `vehicles.year`, and is rejected cleanly when invalid.

**Independent Test**: Open the form, pick brand/model, leave year blank → save succeeds, row has `year=null`. Open for edit, type "2019", save → row has `year=2019`. Type "1800" or "abc" → submit blocked with a visible validation message.

### Implementation for User Story 4

- [X] T028 [US4] Write the DB migration at `supabase/migrations/{timestamp}_add_year_to_vehicles.sql` per data-model.md §2 — `ALTER TABLE public.vehicles ADD COLUMN year smallint;` plus `ADD CONSTRAINT chk_vehicles_year CHECK (year IS NULL OR (year >= 1960 AND year <= 2100));` plus `COMMENT ON COLUMN`. Then run `pnpm db:migrate:dev` and `pnpm db:types` from the repo root to regenerate `@ramcar/db-types`
- [X] T029 [US4] Extend `packages/shared/src/validators/vehicle.ts` — add a `currentYear()` factory function (returns `new Date().getFullYear()`) and extend `vehicleFields` with `year: z.number().int().min(1960, "…").max(currentYear() + 1, "…").optional()`. Error messages MUST reference the new i18n keys added in T032/T033
- [X] T030 [US4] Extend the `Vehicle` TypeScript type at `packages/shared/src/types/vehicle.ts` to include `year: number | null`
- [X] T031 [P] [US4] Unit test the extended `createVehicleSchema` at `packages/shared/src/validators/vehicle.test.ts` (or create it) — accept `year: 2019`; reject `year: 1800` (below bound); reject `year: 2.5` (non-integer); reject `year: "2019"` (confirms no `.coerce` was added); accept `year` absent (optional); assert the upper bound uses `currentYear()+1` by faking system time
- [X] T032 [P] [US4] Add `vehicles.year.*` i18n keys (label, placeholder, "year out of range" validation message, "year must be an integer" message) to `packages/i18n/src/messages/en.json`
- [X] T033 [P] [US4] Mirror T032 additions in `packages/i18n/src/messages/es.json` with Spanish translations (SC-007)
- [X] T034 [US4] Implement `VehicleYearInput` at `packages/features/src/shared/vehicle-brand-model/vehicle-year-input.tsx` per `contracts/vehicle-year-input.contract.ts` — thin wrapper over `@ramcar/ui` `Input` with `type="number"`, `inputMode="numeric"`, `min={1960}`, `max={currentYear()+1}`. Empty input → `onChange(null)`; digits → `onChange(Number(value))`. Final range validation stays with Zod at submit (Y1–Y5)
- [X] T035 [P] [US4] Unit test `VehicleYearInput` at `packages/features/src/shared/vehicle-brand-model/vehicle-year-input.test.tsx` covering Y1 (empty → null), Y2 (`"2019"` → 2019), Y3 (non-digit keystrokes rejected at browser layer), Y4 (visible `min`/`max` attributes), Y5 (disabled prop propagates)
- [X] T036 [US4] Export `VehicleYearInput` from `packages/features/src/shared/vehicle-brand-model/index.ts` and confirm it surfaces through `packages/features/src/shared/index.ts`
- [X] T037 [US4] Add the year field to `packages/features/src/shared/vehicle-form/vehicle-form.tsx` — extend local state with `year: number | null`, extend the `initialDraft` / `onDraftChange` prop shapes additively, render `<VehicleYearInput>` between color and notes, include `year: year ?? undefined` in the `safeParse` / submit payload
- [X] T038 [US4] Extend `packages/features/src/shared/vehicle-form/vehicle-form.test.tsx` with scenarios: entering `2019` persists it on submit; leaving blank persists `null`; entering `1800` blocks submit with a validation message (FR-010, FR-011)
- [X] T039 [US4] Update the web draft-persistence call site under `apps/web/src/features/residents/` (the place that constructs `initialDraft` or consumes `onDraftChange`) to include `year: null` in the persisted draft shape; confirm `useFormPersistence` stays forward-compatible with the additive field (legacy drafts decode cleanly, new drafts include the field)
- [X] T040 [US4] Update `apps/api/src/modules/vehicles/vehicles.repository.ts` `create()` to insert `year: dto.year ?? null` alongside existing columns. `findByUserId()` / `findByVisitPersonId()` bare `.select()` already returns all columns — no code change beyond the regenerated db-types from T028
- [X] T041 [P] [US4] Extend `apps/api/src/modules/vehicles/__tests__/vehicles.e2e-spec.ts` (or the equivalent Jest file) with cases per contracts/vehicles-api-year-extension.md: `year: 2019` accepted (201); `year` absent accepted with null in response; `year: 1800` rejected (400, ZodError path=`year`); `year: 2.5` rejected; `year: "2019"` rejected (confirms no coercion); response body of `GET /api/vehicles?…` includes the new `year` field

**Checkpoint**: Year persists end-to-end through Zod bounds + DB CHECK + API tests + desktop outbox transport (outbox payload is forward-compatible without additional code — verified in Polish).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Pay down the remaining success criteria (SC-003 through SC-008) with CI-level assertions and wire the feature into the cross-app duplication guard.

- [ ] T042 [P] Add a network-traffic zero-fetch Playwright assertion to `apps/web/tests/e2e/vehicle-form.spec.ts` — record `page.on("request", …)` while the user exercises the brand + model autocompletes (including the fallback path), assert zero HTTP requests are issued by the component (SC-004, FR-017)
- [ ] T043 [P] Add an offline desktop integration test at `apps/desktop/src/test/vehicle-form-offline.test.ts` (or the equivalent integration harness) — disable the renderer's network (or run under the existing offline harness), exercise the full brand → model → year → save flow, assert the outbox queues the write with `year` intact and the autocomplete UX remains functional (SC-006)
- [ ] T044 [P] Add or extend an i18n audit test that walks every `vehicles.brand.*`, `vehicles.model.*`, `vehicles.year.*`, and `vehicles.common.*` key in `packages/i18n/src/messages/en.json` and asserts each is present with a non-empty value in `packages/i18n/src/messages/es.json` (SC-007)
- [X] T045 Register the new shared slice in `shared-features.json` at the repo root — add an entry for `vehicle-brand-model` so `pnpm check:shared-features` flags any future per-app duplicate under `apps/web/src/features/` or `apps/desktop/src/features/` (SC-008)
- [X] T046 [P] Run `pnpm check:shared-features` from the repo root and confirm zero violations for the new slice
- [ ] T047 [P] Walk through `specs/016-vehicle-brand-model-autocomplete/quickstart.md` Task 5 ("Run it locally") manually on both `apps/web` (via `pnpm dev`) and `apps/desktop` (via `pnpm --filter @ramcar/desktop dev`), verify each of the six quickstart probes (fuzzy brand match, fallback row, model enables, clear-on-brand-change, digit-only year, offline desktop flow), and record results in the PR description
- [X] T048 [P] Run monorepo-level verification at the repo root: `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm --filter @ramcar/features test -- --grep="bench"` — all green before opening the PR

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup (T001 must install fuse.js before T006 can import it). **BLOCKS** every user story.
- **User Story 1 (Phase 3)**: Depends on Foundational. Blocks US2 and US3 only because US2 extends US1's components (same files) and US3 extends US1's brand-select (same file).
- **User Story 2 (Phase 4)**: Depends on US1 — US2 edits the two components US1 creates.
- **User Story 3 (Phase 5)**: Depends on US1 — T024 edits `vehicle-brand-select.tsx`. Does NOT depend on US2 (the focus-shift logic is orthogonal to the fallback row).
- **User Story 4 (Phase 6)**: Depends on Foundational only. Can run in parallel with US1/US2/US3 by different developers EXCEPT for T037 (which edits `vehicle-form.tsx` — same file as T017). Resolve by scheduling T037 after T017 or merging carefully.
- **Polish (Phase 7)**: Depends on all desired user stories shipping (T042 depends on US2's fallback path; T043 depends on US4's year flow; T044 depends on all i18n keys landing).

### User Story Dependencies

- **US1 (P1, MVP)**: Foundational → US1.
- **US2 (P1)**: Foundational → US1 → US2. **Ships together with US1 as the P1 increment** — without US2, unknown vehicles cannot be saved.
- **US3 (P2)**: Foundational → US1 → US3.
- **US4 (P2)**: Foundational → US4 (independent of US1/2/3 except for the `vehicle-form.tsx` merge point at T037).

### Within Each User Story

- Component implementation before component tests may look like parallel (different files, both marked [P]) but TDD-style: author test and impl in the same session, iterate until green.
- Shared schema extension (T029) before schema tests (T031) and before API tests (T041) — API tests exercise the extended schema.
- DB migration (T028) before `@ramcar/db-types` regeneration and before repository edits (T040) — all downstream typing depends on the generated types.
- Story complete before moving on — each story's checkpoint should be satisfied before starting the next.

### Parallel Opportunities

- Foundational: T004 and T005 (data.ts + data.test.ts) are different files — parallel. T007, T008 are different files from search.ts — parallel after T006. T009 and T010 are different files — parallel.
- US1: T011 and T012 (two components) are different files — parallel. T015 and T016 (their tests) are parallel. T018 is the form-level integration test — depends on T017.
- US2: T021 and T022 (two test files) are parallel after T019/T020.
- US3: T025 and T026 (two test files) are parallel after T024.
- US4: T031 (schema test), T032 (en.json), T033 (es.json) are parallel. T035 (year input test) parallel with T034's implementation. T041 (API tests) parallel after T040.
- Polish: T042, T043, T044, T046, T047, T048 are all different files — parallel. Only T045 must come before T046.
- **Cross-story**: Once Foundational is green, US1 and US4 can be worked by different developers in parallel, with the caveat that T017 and T037 both edit `vehicle-form.tsx` — stage T037 after T017 merges.

---

## Parallel Example: User Story 1

```bash
# After Foundational checkpoint, launch US1 in parallel:
Task: "Implement VehicleBrandSelect in packages/features/src/shared/vehicle-brand-model/vehicle-brand-select.tsx"
Task: "Implement VehicleModelSelect in packages/features/src/shared/vehicle-brand-model/vehicle-model-select.tsx"

# Then, after both components exist, launch their tests in parallel:
Task: "Unit test VehicleBrandSelect in packages/features/src/shared/vehicle-brand-model/vehicle-brand-select.test.tsx"
Task: "Unit test VehicleModelSelect in packages/features/src/shared/vehicle-brand-model/vehicle-model-select.test.tsx"
```

## Parallel Example: Foundational

```bash
# After T006 (search.ts) lands, fan out in parallel:
Task: "Create search unit tests at packages/features/src/shared/vehicle-brand-model/search.test.ts"
Task: "Create search microbenchmark at packages/features/src/shared/vehicle-brand-model/search.bench.ts"
Task: "Add vehicles.brand/model/common i18n keys to packages/i18n/src/messages/en.json"
Task: "Mirror i18n keys in packages/i18n/src/messages/es.json"
```

## Parallel Example: Polish

```bash
# After all stories ship, launch polish tasks in parallel:
Task: "Network-traffic zero-fetch Playwright assertion (SC-004) in apps/web/tests/e2e/vehicle-form.spec.ts"
Task: "Desktop offline integration test (SC-006) in apps/desktop/src/test/vehicle-form-offline.test.ts"
Task: "i18n audit test (SC-007) covering vehicles.* keys"
Task: "Quickstart manual walkthrough on web and desktop"
Task: "pnpm typecheck / lint / test at repo root"
```

---

## Implementation Strategy

### MVP First (US1 — then immediately US2 to complete P1)

1. Complete Phase 1: Setup (fuse.js dep, slice scaffold).
2. Complete Phase 2: Foundational (dataset + search + i18n). **Blocks everything.**
3. Complete Phase 3: US1 — known brand/model picks canonical and saves.
4. Complete Phase 4: US2 — free-text fallback so unknown vehicles can still be saved (P1 is not shippable without US2).
5. **STOP and VALIDATE**: Run the US1 + US2 checkpoints manually on web. This is the P1 ship target.

### Incremental Delivery

1. Setup + Foundational done → platform ready.
2. US1 + US2 done → ship P1 (known + fallback brand/model selection). Internal review / demo.
3. US3 done → ship P2.1 (keyboard-first polish). Independent of US4.
4. US4 done → ship P2.2 (optional year). Independent of US3.
5. Polish done → ship final PR with all success criteria assertions in CI.

### Parallel Team Strategy

With multiple developers after Foundational:

- **Developer A**: US1 → US2 → US3 (sequential on the autocomplete components).
- **Developer B**: US4 (year + DB + schema + API), synchronizing only on the `vehicle-form.tsx` merge point at T037.
- **Developer C** (if available): Polish scaffolding — author the Playwright harness and the i18n audit infrastructure ahead of time so T042 / T044 land cleanly once the stories ship.

---

## Notes

- Tests included because plan.md and research.md explicitly commit to them; SC-003 through SC-007 each require a CI-level assertion.
- [P] = different files, no dependency on an incomplete task. Same-file edits across stories (T017↔T037, T019↔T024) are NOT [P].
- Dataset mutability policy (contracts/dataset-schema.contract.ts): additions are normal PRs; removals need an extra PR sentence because historical vehicle rows may reference the removed string.
- DB CHECK `year <= 2100` is intentionally looser than Zod `year <= currentYear()+1` — defense-in-depth so a migration isn't needed at every year turnover (research.md §7).
- The brand/model dataset is a module-scope frozen constant — NEVER wrap it in a hook, NEVER add it to `@ramcar/shared`, NEVER introduce a runtime fetch for it (quickstart.md Gotchas).
- Commit after each task or logical group. Stop at any checkpoint to validate independently.
