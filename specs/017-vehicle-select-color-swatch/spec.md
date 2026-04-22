# Feature Specification: Vehicle Select Color Swatch

**Feature Branch**: `017-vehicle-select-color-swatch`
**Created**: 2026-04-21
**Status**: Draft
**Input**: User description: "Export the `Swatch` component from `packages/features/src/shared/color-select/color-select.tsx` so it can be consumed outside the color selector. Refactor every form that renders the vehicle select (SelectItem showing `formatVehicleLabel(v)` which currently appends `(#FFFFFF)`) so the option displays the swatch color dot + the color name translated into the active language, instead of the raw hex value. Consolidate the duplicated `formatVehicleLabel` helpers into a single shared implementation used by both web and desktop hosts of the vehicle select."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Readable vehicle color in access event form (Priority: P1)

A guard, resident, or admin opens a form that asks them to pick a vehicle (access event, visitor access event). Each vehicle row currently shows something like `Toyota Avanza — HASD-123 (#FFFFFF)`. The hex value is meaningless to the operator; they recognize cars by color name ("white", "blanco"), not hex. The list needs to show a small colored dot plus the translated color name so the right vehicle can be picked at a glance.

**Why this priority**: This is the user-visible change that drives the whole feature. Operators in both the portal and the guard booth see vehicle selects during every access-event entry, so any readability regression here is felt on every visit. Delivering just this story (with everything else stubbed behind it) already produces a shipped improvement.

**Independent Test**: Seed two vehicles with different colors, open each of the three forms that render the vehicle select, and confirm each option renders a colored dot plus a localized color name (e.g., `Toyota Avanza — HASD-123 · ● Blanco` in Spanish, `… · ● White` in English) and that the raw `(#FFFFFF)` token is gone.

**Acceptance Scenarios**:

1. **Given** the active locale is Spanish and a vehicle's color is `#FFFFFF`, **When** the operator opens the vehicle select, **Then** that option displays the vehicle identity (brand/model/plate) followed by a small white dot and the text "Blanco" — no hex substring is visible.
2. **Given** the active locale is English and a vehicle's color is `#FFFFFF`, **When** the operator opens the same form, **Then** the same option renders with the white dot and the text "White".
3. **Given** a vehicle's color is a hex value the catalog does not recognize (custom hex), **When** the operator opens the vehicle select, **Then** the option displays the hex-colored dot and falls back to the canonical hex label (matching how the color selector itself handles custom hex).
4. **Given** a legacy vehicle whose stored color is a free-text string (not a valid hex), **When** the operator opens the vehicle select, **Then** the option displays the legacy-style placeholder swatch and uses the stored text verbatim as the label.
5. **Given** a vehicle that has no color set, **When** the operator opens the vehicle select, **Then** the option shows the vehicle identity with no swatch and no color suffix — it must not collapse to an empty row.

---

### User Story 2 — Reusable Swatch for other vehicle surfaces (Priority: P2)

Any component that needs to render "a vehicle color at a glance" (vehicle selects in this iteration; future vehicle cards, vehicle tables, access-event timelines, etc.) should be able to import the same swatch visual used by the color selector, instead of reimplementing the hex→swatch rendering. This avoids visual drift (catalog palette, chameleon/chrome effects, legacy placeholder) between surfaces.

**Why this priority**: Without a reusable swatch primitive, the vehicle-select change in Story 1 would either duplicate the swatch logic or render an inconsistent dot. Exposing the swatch keeps future surfaces aligned with the selector users already learned.

**Independent Test**: From a scratch component in either host app, import the shared swatch primitive, pass a catalog hex, a custom hex, a legacy free-text value, and an empty value, and confirm all four render identically to how they render inside the color selector's trigger button today.

**Acceptance Scenarios**:

1. **Given** the shared swatch is imported from the color-select public surface, **When** it is rendered with a catalog hex (e.g., `#FFFFFF`), **Then** it shows the flat dot identical to the one shown in the color selector's trigger for that value.
2. **Given** the shared swatch is rendered with the special chameleon catalog entry, **When** it mounts, **Then** the dot renders with the conic gradient used inside the selector — not a flat color.
3. **Given** the shared swatch is rendered with no value, **When** it mounts, **Then** it renders nothing (no placeholder border, no empty dot) so callers can decide how to handle "no color".

---

### User Story 3 — Single source of truth for the vehicle label (Priority: P3)

The helper that formats `Toyota Avanza — HASD-123 (#FFFFFF)` is copy-pasted into three forms (web resident access event form, desktop resident access event form, shared visitor access event form). When the display rule changes (as it does in Story 1), all three copies must be kept in lockstep, which is the kind of change that silently rots. The helper needs to live in one place, be imported by all three forms, and (now that the color is rendered as a swatch+name, not a suffix) stop emitting the `(hex)` tail.

**Why this priority**: This is the hygiene cleanup that prevents Story 1 from being half-applied. It doesn't add user-visible value on its own, but it prevents the three call sites from diverging on the next change.

**Independent Test**: Search the monorepo for `formatVehicleLabel` — there must be exactly one exported definition, and every call site imports it from the shared module. Remove one call site's import locally and confirm that TypeScript fails (no silent fallback to a local duplicate).

**Acceptance Scenarios**:

1. **Given** the repository is searched for the identifier `formatVehicleLabel`, **When** the matches are listed, **Then** there is exactly one definition and the other matches are all imports of that definition.
2. **Given** the shared helper is updated (e.g., plate formatting changes), **When** all three forms are opened, **Then** the change appears in each without any per-app edit.

---

### Edge Cases

- **Vehicle has a color the catalog doesn't know (custom hex):** render the flat dot at that hex and use the canonical uppercase hex as the label (no translation lookup succeeds).
- **Vehicle has a free-text legacy color (e.g., `"off-white"`):** render the legacy dashed-border placeholder swatch and use the free-text value as the label; do not try to translate it and do not emit a hex substring.
- **Vehicle has no color at all (`null`/empty):** render no swatch and omit the color portion of the label; still show brand/model/plate.
- **Vehicle has no brand/model/plate but does have a color and a vehicleType:** fall back to the existing behavior (show `vehicleType`) and still render the swatch + color name alongside — the color must not be lost just because the identity fell back.
- **Locale switched mid-session:** reopening the select re-renders the color names in the new locale without requiring a reload.
- **Color catalog entry has an effect (`chameleon`, `chrome`):** the swatch renders the effect gradient, not a flat dot, consistent with how the color selector displays it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The swatch visual currently defined inside the color selector MUST be exposed as a reusable component from the color-select module's public surface, so consumers outside that module can render the exact same dot (flat catalog color, custom hex, legacy placeholder, chameleon, chrome, none) without duplicating the logic.
- **FR-002**: The vehicle-select option label MUST NOT include the raw hex string for the vehicle's color. Options that previously rendered `… (#FFFFFF)` MUST instead render a visual swatch dot plus the color's localized human name.
- **FR-003**: The color's localized human name MUST come from the existing vehicle color message catalog, keyed by the canonical catalog entry for that hex. English and Spanish MUST both resolve known catalog hexes to their translated names (e.g., `#FFFFFF` → "White" / "Blanco").
- **FR-004**: For hex values not present in the catalog, the option MUST fall back to displaying the canonical uppercase hex as the color label (no translation is available) alongside a flat swatch at that hex. For free-text legacy color values, the option MUST display the stored text verbatim as the color label alongside the legacy placeholder swatch. For missing/empty color, the option MUST render no swatch and no color label.
- **FR-005**: The helper that formats a vehicle's identity line (currently `formatVehicleLabel` duplicated across three forms) MUST be consolidated into a single shared implementation. Each of the three current call sites MUST import that shared helper; no local duplicate may remain.
- **FR-006**: The shared vehicle-label helper MUST stop emitting the `(hex)` suffix. It MUST return only the vehicle identity (brand/model/plate, falling back to vehicleType when those are all empty). The color swatch and color name are rendered alongside the label by the option renderer, not baked into the string.
- **FR-007**: The three forms currently rendering the vehicle select — web resident access event form, desktop resident access event form, shared visitor access event form — MUST all display option rows using the new swatch + localized color name rendering. No form may be left on the old `(hex)` behavior.
- **FR-008**: The selected value shown in the closed vehicle select (the "trigger" area after a vehicle is picked) MUST follow the same new rendering: vehicle identity plus swatch + localized color name, never raw hex.
- **FR-009**: Switching the application's active locale MUST re-render visible vehicle options with color names translated into the new locale on the next open of the select, without requiring a full reload.
- **FR-010**: The change MUST NOT alter the data model or persistence: vehicles continue to store `color` as a hex (or legacy text) value; translation happens at render time.

### Key Entities

- **Vehicle option row**: one item inside a vehicle select. Composed of the vehicle identity string (brand/model/plate or fallback) plus a swatch dot plus a localized color name. All three pieces are derived at render time from the vehicle record; none are persisted.
- **Color catalog entry**: the existing `{ key, hex, category, effect? }` record used by the color selector. Reused here as the translation key source: entry `key` maps to `vehicles.color.options.<key>` in the message catalog.

### Data Access Architecture

Not applicable. This feature is a presentation-layer change only. No new API endpoints, no schema changes, no new queries — it re-renders data that is already loaded into the vehicle select options today.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In every vehicle select across the three target forms (web resident access event, desktop resident access event, shared visitor access event), zero option labels contain a `#` character at runtime for vehicles with a valid hex color.
- **SC-002**: For a vehicle with color `#FFFFFF`, the rendered option label reads "White" when the active locale is English and "Blanco" when the active locale is Spanish — verified in both web and desktop.
- **SC-003**: A repository-wide search for `function formatVehicleLabel` returns exactly one match after the change (down from three today).
- **SC-004**: The swatch component can be imported and rendered by a file outside `packages/features/src/shared/color-select/` — verified by the three target forms importing and using it.
- **SC-005**: Existing color-selector behavior (the `ColorSelect` component used in vehicle forms) continues to function unchanged — its trigger still shows the correct swatch + label for all color variants (flat, custom hex, legacy, chameleon, chrome).

## Assumptions

- The vehicle color message catalog (`vehicles.color.options.*` in `@ramcar/i18n`) already contains the full set of catalog keys needed for translation. No new translation keys need to be authored — this feature only reuses existing ones.
- The `Vehicle` type surfaced to all three forms already exposes the `color` field as it does today (hex string, legacy free text, or null). No type changes are required in `@ramcar/shared`.
- The shared helper will live in `@ramcar/features` (the cross-app shared feature module package), consistent with the project's "shared core with platform extensions" policy for bi-app features.
- "Localized color name" means the string returned by the existing i18n lookup for the catalog entry's key — it is not a new translation effort.
- The swatch's visual (size, border, gradients for chameleon/chrome) stays identical to today's color selector trigger — this feature does not redesign the swatch.
