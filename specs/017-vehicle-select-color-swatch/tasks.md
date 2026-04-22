---
description: "Task list for feature 017-vehicle-select-color-swatch"
---

# Tasks: Vehicle Select Color Swatch

**Input**: Design documents from `/specs/017-vehicle-select-color-swatch/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: One targeted unit test is included because `plan.md` names `format-vehicle-label.test.ts` as an artifact of this feature. No additional test tasks are generated — the rest of the verification is covered by the `quickstart.md` manual matrix and the existing `color-select.test.tsx` / `vehicle-form.test.tsx` suites, which must remain green.

**Organization**: Tasks are grouped by user story (US1 — readable vehicle color in forms, US2 — reusable `Swatch` export, US3 — single-source `formatVehicleLabel`). US1 is the user-visible P1 outcome; it consumes the primitives produced by US2 and US3. US2 and US3 can run in parallel after the Foundational phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps the task to a user story from spec.md
- Paths are absolute within the monorepo root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm working context for a presentation-only change. No new dependencies, no new tooling — this feature touches existing packages only.

- [X] T001 Confirm current branch `017-vehicle-select-color-swatch` is checked out and clean at repo root (`git status` — expect untracked `specs/017-vehicle-select-color-swatch/` and the three provisional diffs listed in the initial git status; no other dirty state)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Register the one new subpath export so downstream work in US3 and US1 can import from it.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Add `"./shared/vehicle-label": "./src/shared/vehicle-label/index.ts"` to the `exports` map in `packages/features/package.json` (place alongside the existing `./shared/*` entries; no change to other keys)

**Checkpoint**: Foundation ready — US2 and US3 can now start in parallel; US1 starts once both finish.

---

## Phase 3: User Story 2 — Reusable Swatch for other vehicle surfaces (Priority: P2)

**Goal**: Expose the existing file-local `Swatch` component plus its `SwatchVariant` type and a new `resolveSwatch(colorValue, t)` helper from `@ramcar/features/shared/color-select`, so any caller can render the same swatch visual used by the color selector.

**Independent Test**: From a scratch file in either host app, import `Swatch`, `SwatchVariant`, `resolveSwatch`, and `ResolvedSwatch` from `@ramcar/features/shared/color-select` and render a swatch for a catalog hex, a custom hex, a legacy free-text value, the chameleon catalog entry, and `null`. All five must render identically to the corresponding visuals in the existing `ColorSelect` trigger.

### Implementation for User Story 2

- [X] T003 [US2] In `packages/features/src/shared/color-select/color-select.tsx`, change the declaration of the file-local `Swatch` component to a named `export function Swatch(...)` (or add `export` to the existing declaration). Do not move the component; promotion must remain in place per research Decision 1.
- [X] T004 [US2] In the same file `packages/features/src/shared/color-select/color-select.tsx`, add `export` to the `SwatchVariant` type declaration and to the `swatchVariantForEntry` helper so both are part of the module's public surface.
- [X] T005 [US2] In the same file `packages/features/src/shared/color-select/color-select.tsx`, add a new exported `interface ResolvedSwatch { variant: SwatchVariant; color: string | null; label: string }` and a new exported `resolveSwatch(colorValue: string | null | undefined, t: (key: string) => string): ResolvedSwatch` function that wraps the existing `computeTriggerDisplay` logic but drops the `isPlaceholder` flag (per research Decision 2 — reuse `normalizeHex` + `lookupByHex` + `t('vehicles.color.options.' + entry.key)`; fall back to canonical uppercase hex for unknown valid hexes, raw string for legacy free text, `{ variant: "none", color: null, label: "" }` for empty).
- [X] T006 [US2] In `packages/features/src/shared/color-select/index.ts`, re-export the four new public members: `Swatch`, `SwatchVariant`, `resolveSwatch`, `ResolvedSwatch`. Keep all pre-existing exports untouched.
- [X] T007 [US2] Run `pnpm --filter @ramcar/features test -- color-select` (or the existing colocated `color-select.test.tsx` via the package test command) and confirm the pre-existing suite still passes — the promotion must be purely additive (ties to SC-005).

**Checkpoint**: `Swatch`, `SwatchVariant`, `resolveSwatch`, and `ResolvedSwatch` are importable from `@ramcar/features/shared/color-select`. User Story 2 is complete and independently testable.

---

## Phase 4: User Story 3 — Single source of truth for the vehicle label (Priority: P3)

**Goal**: Create the sole `formatVehicleLabel` implementation in `@ramcar/features/shared/vehicle-label` so the three forms in US1 can all import it (and so a repo-wide search returns exactly one definition).

**Independent Test**: `grep -rn "function formatVehicleLabel" apps/web/src apps/desktop/src packages/features/src --include="*.ts" --include="*.tsx"` returns the new shared file only, and the colocated Vitest unit test (`format-vehicle-label.test.ts`) passes.

### Implementation for User Story 3

- [X] T008 [P] [US3] Create `packages/features/src/shared/vehicle-label/format-vehicle-label.ts` containing the minimal structural interface `VehicleLabelInput { brand?: string | null; model?: string | null; plate?: string | null; vehicleType: string }` and an exported `formatVehicleLabel(v: VehicleLabelInput): string` that joins `brand`, `model`, and `plate` as `"Brand Model — PLATE"` (graceful omit when a part is empty), with `vehicleType` as the fallback when all three identity fields are empty/null. **Do not** append any color or hex suffix.
- [X] T009 [P] [US3] Create `packages/features/src/shared/vehicle-label/index.ts` that re-exports `formatVehicleLabel` and `VehicleLabelInput` from `./format-vehicle-label`.
- [X] T010 [P] [US3] Create `packages/features/src/shared/vehicle-label/__tests__/format-vehicle-label.test.ts` (Vitest) covering, at minimum: (a) all three identity fields present → `"Toyota Avanza — HASD-123"`; (b) only `brand` present → `"Toyota"`; (c) only `vehicleType` present → `"motorcycle"`; (d) `brand + model` but no `plate` → `"Honda Civic"` (no trailing `— `); (e) input with extra `color` field is accepted structurally (assignability) and the color is **not** present in the output string.
- [X] T011 [US3] Run `pnpm --filter @ramcar/features test -- format-vehicle-label` and confirm the new test file passes.
- [X] T012 [US3] Run `grep -rn "function formatVehicleLabel" apps/web/src apps/desktop/src packages/features/src --include="*.ts" --include="*.tsx"` — at this point there will still be **four** matches (the new shared file plus the three pre-existing duplicates). Record the three duplicate locations for removal in US1 (expected: `apps/web/src/features/residents/components/access-event-form.tsx`, `apps/desktop/src/features/residents/components/access-event-form.tsx`, `packages/features/src/visitors/components/visit-person-access-event-form.tsx`).

**Checkpoint**: The shared `formatVehicleLabel` exists, is unit-tested, and is reachable as `@ramcar/features/shared/vehicle-label`. User Story 3's "single definition" success criterion (SC-003) will be reached after US1 removes the duplicates.

---

## Phase 5: User Story 1 — Readable vehicle color in access event form (Priority: P1) 🎯 MVP

**Goal**: Rewrite the three forms that render a vehicle select so each `SelectItem` (and the closed trigger) shows `formatVehicleLabel(v)` + `<Swatch />` + localized color name instead of the raw `(#FFFFFF)` suffix. Locale-aware in en/es. No `#` character visible for catalog-hex vehicles.

**Dependencies**: US2 (exported `Swatch`, `resolveSwatch`) and US3 (shared `formatVehicleLabel`) MUST be complete before this phase starts.

**Independent Test**: Execute the `quickstart.md` §2, §3 matrix — all five fixture vehicles render correctly in all four form/host combinations, the closed trigger mirrors the list, and switching locale re-renders color names without a reload. Dedup grep in `quickstart.md` §6 returns exactly one definition.

### Implementation for User Story 1

- [X] T013 [P] [US1] Refactor `packages/features/src/visitors/components/visit-person-access-event-form.tsx`:
  - Delete the file-local `formatVehicleLabel` definition.
  - Import `{ formatVehicleLabel }` from `@ramcar/features/shared/vehicle-label`.
  - Import `{ Swatch, resolveSwatch }` from `@ramcar/features/shared/color-select`.
  - Inside the `<SelectItem>` render for each vehicle, replace the single label string with `<span className="flex items-center gap-2">` containing (in order) `<span>{formatVehicleLabel(v)}</span>`, and — when `v.color != null` — `<Swatch variant={resolved.variant} color={resolved.color} />` followed by `<span>{resolved.label}</span>`, where `resolved = resolveSwatch(v.color, useI18n().t)`. Skip both the swatch and the label when `v.color == null`.
  - Ensure the same resolver is used for `SelectValue` rendering so the closed trigger mirrors list rows (FR-008).
  - Do not introduce `"use client"`, `next/*`, `window.electron`, or any concrete i18n library import — read locale via the existing `useI18n()` adapter port only.

- [X] T014 [P] [US1] Refactor `apps/web/src/features/residents/components/access-event-form.tsx`:
  - Delete the file-local `formatVehicleLabel` definition.
  - Import `{ formatVehicleLabel }` from `@ramcar/features/shared/vehicle-label`.
  - Import `{ Swatch, resolveSwatch }` from `@ramcar/features/shared/color-select`.
  - Obtain the translator via the existing `next-intl` pattern already used in this file (e.g., `useTranslations("vehicles.color.options")` — or the full-key variant the file already uses) and pass a `(key) => t(key)` function to `resolveSwatch`.
  - Rewrite each `<SelectItem>` (and `SelectValue`) per the contract in T013: identity span + conditional `<Swatch />` + localized color name; skip both when `v.color == null`.

- [X] T015 [P] [US1] Refactor `apps/desktop/src/features/residents/components/access-event-form.tsx`:
  - Delete the file-local `formatVehicleLabel` definition.
  - Import `{ formatVehicleLabel }` from `@ramcar/features/shared/vehicle-label`.
  - Import `{ Swatch, resolveSwatch }` from `@ramcar/features/shared/color-select`.
  - Obtain the translator via the existing `react-i18next` pattern already used in this file (e.g., `useTranslation()` → `t`) and pass a `(key) => t(key)` adapter to `resolveSwatch`.
  - Rewrite each `<SelectItem>` (and `SelectValue`) per the contract in T013.

- [X] T016 [US1] From repo root run `grep -rn "function formatVehicleLabel" apps/web/src apps/desktop/src packages/features/src --include="*.ts" --include="*.tsx"` — must now return **exactly one** match: `packages/features/src/shared/vehicle-label/format-vehicle-label.ts` (satisfies SC-003).

- [X] T017 [US1] From repo root run `grep -rn "formatVehicleLabel" apps/web/src apps/desktop/src packages/features/src --include="*.ts" --include="*.tsx"` — must return the definition plus three call-site imports plus the test file (no stray duplicates, no orphaned references).

- [ ] T018 [US1] Execute `quickstart.md` §2 Form A and Form B in `apps/web` (`pnpm --filter @ramcar/web dev`): step through the five-fixture matrix in `en` then switch to `es` and reopen the select. Confirm: (i) no `#` appears for catalog vehicles, (ii) "White"/"Blanco" swap correctly, (iii) custom hex renders flat dot + canonical uppercase hex label, (iv) legacy free text renders dashed placeholder + verbatim label, (v) null color renders identity-only, (vi) closed trigger mirrors list rows. Record result in the PR description.

- [ ] T019 [US1] Execute `quickstart.md` §3 Form C and Form D in `apps/desktop` (`pnpm --filter @ramcar/desktop dev`): step through the same five-fixture matrix + locale swap. Confirm all six bullets from T018 and that the `react-i18next` translator yields the same names as `next-intl` did on web.

**Checkpoint**: All three forms render the new option layout in both apps and both locales; the closed trigger matches; SC-001, SC-002, SC-003, SC-004 are verifiable from the running apps and from `grep`. User Story 1 is fully functional and shippable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final static checks and regression validation before merge. Per `CLAUDE.md` "Git Rules" — do NOT commit or push unless the user explicitly asks.

- [X] T020 From repo root run `pnpm typecheck` — must pass across all workspaces (enforces strict-mode correctness of the new exports and the three refactored forms).
- [X] T021 From repo root run `pnpm lint` — must pass.
- [X] T022 From repo root run `pnpm --filter @ramcar/features test` — must pass (includes the new `format-vehicle-label.test.ts` from US3 and the pre-existing `color-select.test.tsx`).
- [ ] T023 Execute `quickstart.md` §5 regression check on the vehicle create/edit form's `ColorSelect`: trigger still shows the correct swatch + localized name for flat catalog, custom hex, chameleon, chrome, legacy, and `none`; popover still shows all catalog categories + "Add custom color" + "Current" row (ties to SC-005).
- [X] T024 Re-read each of the three refactored files (`packages/features/src/visitors/components/visit-person-access-event-form.tsx`, `apps/web/src/features/residents/components/access-event-form.tsx`, `apps/desktop/src/features/residents/components/access-event-form.tsx`) and confirm: no leftover imports of a local `formatVehicleLabel`, no `"use client"` added to the shared module, no `next/*` or `window.electron` imports added to the shared visitor form, no new `(#hex)` string construction anywhere (FR-002, FR-006, FR-008).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup. Blocks the `@ramcar/features/shared/vehicle-label` import path used in US3 and US1.
- **User Story 2 (Phase 3 — P2)**: Depends on Foundational. Independent of US3.
- **User Story 3 (Phase 4 — P3)**: Depends on Foundational. Independent of US2. Can run in parallel with US2.
- **User Story 1 (Phase 5 — P1)**: Depends on both US2 (needs exported `Swatch` + `resolveSwatch`) and US3 (needs shared `formatVehicleLabel`).
- **Polish (Phase 6)**: Depends on US1 complete.

### User Story Dependencies

- **US2 (P2)** — independent after Foundational; delivers the exported swatch primitive.
- **US3 (P3)** — independent after Foundational; delivers the shared label helper + its test.
- **US1 (P1)** — consumes US2 and US3. This inverts the priority → dependency order: the lower-priority stories are the **prerequisites** of the user-visible P1 outcome (normal for a presentation refactor layered on extracted primitives).

### Within Each User Story

- US2: T003–T006 sequential (all touch the same `color-select.tsx` file), then T007 verifies no regression.
- US3: T008, T009, T010 can run in parallel (distinct files); T011 and T012 after.
- US1: T013, T014, T015 can run in parallel (distinct files); T016–T019 after the three refactors land.

### Parallel Opportunities

- US2 and US3 can run concurrently after T002.
- Within US3: T008, T009, T010 in parallel.
- Within US1: T013, T014, T015 in parallel.
- Polish tasks T020, T021, T022 can run concurrently (distinct commands on disjoint workspaces).

---

## Parallel Example: User Story 1

```bash
# Three form refactors touch three different files and can run in parallel
# once US2 + US3 are green:

Task T013: Refactor packages/features/src/visitors/components/visit-person-access-event-form.tsx
Task T014: Refactor apps/web/src/features/residents/components/access-event-form.tsx
Task T015: Refactor apps/desktop/src/features/residents/components/access-event-form.tsx
```

---

## Parallel Example: User Story 3

```bash
# All three file creations are independent and can run in parallel:

Task T008: Create packages/features/src/shared/vehicle-label/format-vehicle-label.ts
Task T009: Create packages/features/src/shared/vehicle-label/index.ts
Task T010: Create packages/features/src/shared/vehicle-label/__tests__/format-vehicle-label.test.ts
```

---

## Implementation Strategy

### MVP First

The MVP for this feature is **US1** (the user-visible change). However, US1 is not implementable on its own — it consumes the primitives produced by US2 and US3. The MVP path is therefore:

1. Complete Phase 1 Setup (T001).
2. Complete Phase 2 Foundational (T002).
3. Complete Phase 3 US2 and Phase 4 US3 in parallel.
4. Complete Phase 5 US1.
5. **STOP and VALIDATE**: Run the `quickstart.md` §2 and §3 matrices end-to-end.
6. Ship.

### Incremental Delivery

This feature is small (~6 files touched) and all three stories land in the same PR. Splitting would leave the codebase in one of two broken states:

- US2+US3 only: two new exports exist but nothing consumes them — dead code.
- US1 only: refactored forms would reference exports that don't exist — build-break.

Therefore the three stories are **co-delivered**; the story boundaries exist for reviewability and test isolation, not for separate shipping.

### Parallel Team Strategy

With two developers:

1. Both work on Phase 1 + Phase 2 together (one trivial task each).
2. Developer A takes Phase 3 (US2) — confined to `color-select.tsx` and its barrel.
3. Developer B takes Phase 4 (US3) — confined to the new `shared/vehicle-label/` folder.
4. After both land, either developer (or both in parallel across the three forms) executes Phase 5 (US1).
5. Joint Phase 6 polish.

---

## Notes

- `[P]` tasks = different files, no dependencies.
- The spec is presentation-only: no database, no API, no new translation keys, no new tenant scoping.
- Per `CLAUDE.md` "Git Rules": do NOT commit or push unless explicitly asked.
- Per `CLAUDE.md` shared-module purity rules: `packages/features/src/**` must not gain `"use client"`, `next/*`, `window.electron`, or concrete i18n library imports in the course of this work.
- Success criteria mapping: SC-001 & SC-002 → T018, T019; SC-003 → T016; SC-004 → T013, T014, T015 (by virtue of the imports); SC-005 → T007, T023.
- After T024, the working tree will still show the three provisional diffs flagged in the initial `git status` (`CLAUDE.md`, `provider-sidebar.tsx`, `last-event-badge.tsx`, `recent-events-list.tsx`) unless the user says otherwise — do not touch those files as part of this feature.
