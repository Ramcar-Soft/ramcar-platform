# Implementation Plan: Vehicle Select Color Swatch

**Branch**: `017-vehicle-select-color-swatch` | **Date**: 2026-04-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/017-vehicle-select-color-swatch/spec.md`

## Summary

The vehicle select dropdown in three separate forms currently renders each option as `Brand Model — PLATE (#FFFFFF)`, showing raw hex for the color. This is unreadable to operators and duplicates the label helper across three files. This feature (a) promotes the existing private `Swatch` component inside `color-select.tsx` to a first-class export of `@ramcar/features/shared/color-select`, (b) introduces a single shared `formatVehicleLabel` in the features package that returns only the vehicle identity (no hex suffix), and (c) rewrites each of the three vehicle selects to render `<Swatch />` + the localized color name using the existing `vehicles.color.options.<key>` i18n messages, with graceful fallbacks for custom-hex, legacy free-text, and missing-color vehicles. No schema changes, no API changes, no new translation keys.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode across the monorepo), React 18, Node 22 LTS
**Primary Dependencies**: `@ramcar/features` (shared cross-app module), `@ramcar/ui` (shadcn primitives: `Select`, `SelectItem`), `@ramcar/i18n` (existing `vehicles.color.options.*` message catalog), `next-intl` v4 (web host), `react-i18next` (desktop host), both adapted through `useI18n()` inside the shared module
**Storage**: N/A — presentation-only change. Vehicles continue to persist `color` as hex or legacy text through the existing API/DB path; nothing on the data layer moves.
**Testing**: Vitest for `@ramcar/features` (colocated `*.test.tsx`), React Testing Library for component assertions. Existing `color-select.test.tsx` and `vehicle-form.test.tsx` serve as patterns.
**Target Platform**: `apps/web` (Next.js 16 App Router) and `apps/desktop` (Electron 30 + Vite renderer). Web www app is not affected (no vehicle selects there).
**Project Type**: Monorepo — shared feature module + two host apps. No backend or database touched.
**Performance Goals**: No measurable impact — the change swaps one string render for a `<Swatch />` + localized `<span>` per option. Vehicle selects render on the order of 10–100 items; no virtualization needed.
**Constraints**: Shared module MUST remain framework-neutral per `CLAUDE.md` rules (no `"use client"`, no `next/*`, no `window.electron`, no direct i18n library). All locale lookups route through the `useI18n()` adapter port so both hosts stay wired to their respective i18n library. Color-catalog lookup reuses `lookupByHex(normalizeHex(color))` — no new catalog or mapping is introduced.
**Scale/Scope**: Three call sites (`packages/features/src/visitors/components/visit-person-access-event-form.tsx`, `apps/web/src/features/residents/components/access-event-form.tsx`, `apps/desktop/src/features/residents/components/access-event-form.tsx`) + one new export from `packages/features/src/shared/color-select/index.ts` + one new shared helper file. ~6 files touched.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies? | Status | Notes |
|-----------|----------|--------|-------|
| I. Multi-Tenant Isolation | No | ✅ pass | No queries changed; no `tenant_id` path touched. |
| II. Feature-Based Architecture | Yes | ✅ pass | Shared helper + Swatch export live under `packages/features/src/shared/`, consistent with the existing cross-app sharing pattern (spec 014). No feature-to-feature imports introduced. |
| III. Strict Import Boundaries | Yes | ✅ pass | `apps/*/features/*` imports from `@ramcar/features` (allowed). `shared/` does not import from `features/`. No desktop renderer → Node access. |
| IV. Offline-First Desktop | Yes (indirect) | ✅ pass | Change is purely render-side and reads fields already present in the `Vehicle` objects fetched through the existing outbox/online transport. No SQLite or sync path touched. |
| V. Shared Validation via Zod | No | ✅ pass | No new DTOs, no schema changes, no external input. |
| VI. Role-Based Access Control | No | ✅ pass | No role-gated UI changes. |
| VII. TypeScript Strict Mode | Yes | ✅ pass | New module stays `strict: true`; `Swatch` export is typed via the existing `SwatchVariant` union and color prop. |
| VIII. API-First Data Access | No | ✅ pass | No database or API touched. |

Additional monorepo rules from `CLAUDE.md`:

- **Cross-app shared feature modules (spec 014)**: The new `formatVehicleLabel` helper and the `Swatch` re-export live in `@ramcar/features`. Per-app duplication is what this spec is *removing*; no new duplicates are introduced. ✅
- **Shared module purity**: No `"use client"`, no `next/*`, no `window.electron`, no concrete i18n library imports are added to the shared module. Locale messages are read exclusively via `useI18n()`. ✅
- **UI pattern rules (right-side Sheet for create/edit)**: Not applicable — this feature does not add or modify any catalog create/edit flow.

**Gate result**: PASS. No violations, no Complexity Tracking rows required.

## Project Structure

### Documentation (this feature)

```text
specs/017-vehicle-select-color-swatch/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (tiny — presentation entities only)
├── quickstart.md        # Phase 1 output (manual verification steps for both apps)
├── contracts/           # Not applicable for this feature — see note below
└── checklists/
    └── requirements.md  # Spec validation checklist (created by /speckit.specify)
```

**Note on `contracts/`**: This feature exposes no external interfaces (no HTTP endpoints, no CLI, no IPC messages, no grammar). The only "contract" is a React component export (`Swatch`) and a pure function export (`formatVehicleLabel`); both are documented in `data-model.md` under "Exports / Public surface" rather than in a separate `contracts/` directory.

### Source Code (repository root)

```text
packages/features/src/shared/color-select/
├── color-select.tsx           # MODIFY: promote `Swatch` + `SwatchVariant` + `swatchVariantForEntry` from file-local to exported. Also export a small `resolveSwatch(colorValue, t)` helper that maps an arbitrary hex/legacy/null color to `{ variant, color, label }` — reusing the logic already in `computeTriggerDisplay`.
└── index.ts                   # MODIFY: re-export `Swatch`, `SwatchVariant`, and `resolveSwatch` from the module barrel.

packages/features/src/shared/vehicle-label/            # NEW folder
├── format-vehicle-label.ts    # NEW: sole `formatVehicleLabel(v: Vehicle)` definition (identity-only, no hex suffix).
├── index.ts                   # NEW: barrel export.
└── __tests__/
    └── format-vehicle-label.test.ts   # NEW: covers identity-only output, missing-fields fallback to vehicleType, empty-object safety.

packages/features/src/visitors/components/
└── visit-person-access-event-form.tsx  # MODIFY: drop local `formatVehicleLabel`; import shared one. Rewrite `<SelectItem>` children to render vehicle identity + `<Swatch />` + localized color name (via `resolveSwatch` + `useI18n().t`).

apps/web/src/features/residents/components/
└── access-event-form.tsx       # MODIFY: same refactor as above. Import `Swatch`, `resolveSwatch`, and `formatVehicleLabel` from `@ramcar/features/shared/*`. Translation still via `next-intl`'s `useTranslations("vehicles.color.options")`.

apps/desktop/src/features/residents/components/
└── access-event-form.tsx       # MODIFY: same refactor. Translation via `react-i18next`'s `useTranslation()`.

packages/features/package.json
└── exports                     # MODIFY: add `"./shared/vehicle-label": "./src/shared/vehicle-label/index.ts"`.
```

**Structure Decision**: The feature lives entirely in `packages/features` plus the three consuming form files. No new app-level directories, no new API or DB migrations. The two promoted exports (`Swatch`, `formatVehicleLabel`) each live next to their logical owner: `Swatch` in `color-select/` (it is the color-select's primitive); `formatVehicleLabel` in a new sibling folder `vehicle-label/` (it is not color-specific — it also handles brand/model/plate/vehicleType fallback, which does not belong under `color-select/`). The web and desktop access-event forms are not yet migrated into `@ramcar/features` (they remain per-app today); they become consumers of shared primitives but stay where they are. Migrating the full residents feature into the shared package is explicitly out of scope per the migration-status note in `CLAUDE.md`.

## Phase 0 Artifacts

- `research.md` — resolves the three open decisions: (1) where the reusable swatch helper lives, (2) how hex → localized name is resolved without touching the i18n adapter, (3) how the three forms access the helper given their different i18n hosts.

## Phase 1 Artifacts

- `data-model.md` — describes the two exported surfaces (`Swatch` props, `resolveSwatch` return shape, `formatVehicleLabel` signature) and the input `Vehicle` shape they depend on.
- `quickstart.md` — step-by-step manual verification for each of the three forms in both web (en/es) and desktop (en/es), plus the "custom hex", "legacy text", "null color" edge cases.
- Agent context file (`CLAUDE.md` active technologies block) — updated via `.specify/scripts/bash/update-agent-context.sh claude`.

## Complexity Tracking

Not applicable. Constitution Check passes with no violations.
