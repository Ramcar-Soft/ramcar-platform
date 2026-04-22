# Research: Vehicle Select Color Swatch

**Feature**: 017-vehicle-select-color-swatch
**Date**: 2026-04-21

This document resolves the small set of design questions that arose while filling the Technical Context of `plan.md`. None of these were flagged as `[NEEDS CLARIFICATION]` in the spec (defaults were taken from the existing color-selector behavior), but they are recorded here so the implementation can proceed without re-deriving the rationale.

---

## Decision 1 — Where does the shared swatch live, and what is its export surface?

**Decision**: Promote the existing file-local `Swatch` component inside `packages/features/src/shared/color-select/color-select.tsx` to an exported member of the same module, plus re-export it from `packages/features/src/shared/color-select/index.ts`. Also promote the `SwatchVariant` type and the `swatchVariantForEntry(entry)` helper. Additionally, expose a thin `resolveSwatch(colorValue, t)` function that wraps the existing `computeTriggerDisplay` logic but accepts a raw color value (hex / legacy text / null) and returns `{ variant, color, label }` — the three values a caller needs to render a swatch dot + its label for an arbitrary vehicle color.

**Rationale**:

- `Swatch` already handles every variant the feature needs (flat, legacy, chameleon, chrome, none). Duplicating it in a new file would violate Story 2's "single source" intent.
- `computeTriggerDisplay` is already exported from the same file; the reverse-lookup-plus-translation it performs is exactly what a vehicle-select option needs. `resolveSwatch` is literally `computeTriggerDisplay` renamed and with the `isPlaceholder` flag dropped (a trigger-only concern). We could alternatively expose `computeTriggerDisplay` directly, but its name implies a use-case the vehicle select does not have.
- Keeping the promotion *in place* (same file, same module) avoids moving the component and potentially breaking anyone already importing `ColorSelect` from it.

**Alternatives considered**:

- **Extract `Swatch` into its own file** (e.g., `color-select/swatch.tsx`). Rejected because it fragments the module without benefit — `Swatch` is still conceptually part of the color-select primitive family, and the color-select file is not large enough to warrant splitting. It would also require editing more import lines in the tests and in `color-select.tsx` itself.
- **Create a new `@ramcar/features/shared/swatch` package** and have color-select import from it. Rejected as premature — there is exactly one new consumer (the vehicle select) and this can be revisited if a third consumer appears.
- **Re-implement the swatch inline in each of the three vehicle-select forms**. Rejected because it is exactly the duplication Story 2 exists to prevent.

---

## Decision 2 — How do we translate a hex color to a human name at the vehicle-select render site?

**Decision**: Reuse the existing `vehicles.color.options.<key>` message catalog. The lookup path is: `color` (string) → `normalizeHex(color)` → `lookupByHex(hex)` → if found, `t('vehicles.color.options.' + entry.key)`; if not found and the string is a valid hex, fall back to the canonical uppercase hex; otherwise (legacy free text) fall back to the raw string as-is. This is the same resolution path `computeTriggerDisplay` already implements — the new `resolveSwatch` helper encapsulates it.

**Rationale**:

- The entire translation infrastructure is already in place: `@ramcar/i18n/messages/en.json` and `es.json` both contain the `vehicles.color.options.*` namespace (verified: `white → White / Blanco`). No new translation keys needed.
- Using the existing catalog keeps the vehicle select visually and linguistically consistent with the `ColorSelect` trigger, where users already learned the color naming.
- The shared module reads translations via `useI18n().t` (the port adapter). The web host wires this to `next-intl`; the desktop host wires it to `react-i18next`. Neither host app needs any new wiring for this feature — both already wire `useI18n` for all shared-feature consumption (spec 014).

**Alternatives considered**:

- **Pass the pre-translated color name into the helper from each host app.** Rejected — it would force each of the three forms to perform the lookup-and-translate dance locally, reintroducing exactly the duplication we're removing.
- **Create a dedicated `useColorName(hex)` hook in the shared module.** Considered. Rejected because a pure function (`resolveSwatch(value, t)`) is simpler, testable without React Testing Library, and composes with the three call sites' existing `useI18n()` / `useTranslations()` setup without needing a new hook in the shared module.
- **Hardcode English-only names.** Rejected — the whole point of the feature is locale-aware readability, and both apps already run bilingually (en/es).

---

## Decision 3 — Where does the consolidated `formatVehicleLabel` live?

**Decision**: New folder `packages/features/src/shared/vehicle-label/` containing `format-vehicle-label.ts` (sole exported definition), `index.ts` (barrel), and `__tests__/format-vehicle-label.test.ts`. Register the new export in `packages/features/package.json` at the path `./shared/vehicle-label`. The three consuming forms import it from `@ramcar/features/shared/vehicle-label`.

**Rationale**:

- The helper is not color-specific — it formats brand/model/plate with a `vehicleType` fallback. Co-locating it under `color-select/` would misplace it.
- `@ramcar/features/shared/` is already the canonical home for cross-app primitives shared between web and desktop (spec 014). Sibling folders `image-capture/`, `vehicle-form/`, `resident-select/`, `visit-person-status-select/`, `vehicle-brand-model/` establish the pattern.
- A dedicated folder (rather than dropping the function into a generic `utils.ts`) keeps its public surface discoverable and makes test co-location unambiguous.

**Alternatives considered**:

- **Put it in `@ramcar/shared`** (the validators/types/utilities package). Rejected — `@ramcar/shared` is currently typed as "types + Zod schemas + pure utilities with no React surface", and while `formatVehicleLabel` is pure, its three call sites all import `@ramcar/features` already, so grouping it with the other shared UI primitives keeps consumers' import graph tighter.
- **Extend the existing `packages/features/src/shared/vehicle-form/` folder with the helper.** Rejected — the `vehicle-form` folder is the *form* used to create/edit a vehicle, not vehicle rendering utilities. Mixing the two concerns makes the folder harder to reason about as either grows.
- **Export it from `color-select/` alongside `Swatch`.** Rejected — see Decision 1; the swatch is color-specific, this helper is vehicle-identity-specific.

---

## Decision 4 — How is the option rendered inside each `SelectItem`?

**Decision**: Each `SelectItem` renders a single flex row: `<span class="flex items-center gap-2">` containing (in order) the vehicle identity `<span>` from `formatVehicleLabel(v)`, a separator dot or the `<Swatch />`, and the localized color name `<span>`. If the vehicle has no color (`v.color == null`), the swatch and the color span are both skipped — the row shows only the identity string. The shadcn `SelectItem` component already accepts arbitrary React children, so no changes to `@ramcar/ui` are needed.

**Rationale**:

- shadcn/radix Select accepts any children inside a `SelectItem`; flex layout works inside both native trigger rendering (`SelectValue` mirrors the selected item's children) and the popover list. This keeps the trigger (FR-008) consistent with the list.
- A flex row with `gap-2` matches the visual spacing already used inside `ColorSelect`'s own trigger and dropdown items, giving the vehicle select the same rhythm.

**Alternatives considered**:

- **Render identity on one line and swatch+name underneath on a second line.** Rejected — visually heavier; the select popover is already tight. Users scan this list quickly.
- **Render only a swatch (no color name).** Rejected — fails FR-003 (localized color name must appear). The name is the whole readability improvement; the swatch alone doesn't disambiguate "Azul oscuro" vs "Azul marino".

---

## Decision 5 — Do we need to change the outbox / sync path for desktop?

**Decision**: No. This change is render-only, on data already present in memory after the vehicles query resolves. Vehicle rows are stored in SQLite (main process) exactly as they are today, with `color` as a hex string. No outbox operations are added or changed.

**Rationale**: Confirmed by inspection — the three forms consume `vehicles` from an already-loaded array prop. No mutation of the vehicle record happens in this feature.

**Alternatives considered**: None — sync changes were never on the table.

---

## Open questions

None. All `[NEEDS CLARIFICATION]` markers were avoided during spec authoring by using the existing `ColorSelect` behavior as the authoritative source for edge-case handling (custom hex fallback, legacy free text, chameleon/chrome effects).
