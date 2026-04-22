# Data Model: Vehicle Select Color Swatch

**Feature**: 017-vehicle-select-color-swatch
**Date**: 2026-04-21

This feature is a presentation-layer change. There is no database schema, no persisted state, no new table, no migration. The "entities" below describe the **in-memory presentation shapes** and the **public surface** the feature exposes for other code to consume.

---

## 1. Persisted entities touched

None directly. The feature reads the existing `Vehicle` object supplied by the three consuming forms. For reference, the relevant fields are:

| Field         | Type                        | Notes                                                                                     |
|---------------|-----------------------------|-------------------------------------------------------------------------------------------|
| `id`          | `string`                    | Used as the `SelectItem` value. Unchanged.                                                |
| `brand`       | `string \| null \| undefined` | Used in the identity line.                                                              |
| `model`       | `string \| null \| undefined` | Used in the identity line.                                                              |
| `plate`       | `string \| null \| undefined` | Used in the identity line.                                                              |
| `vehicleType` | `string`                    | Fallback used in the identity line when brand/model/plate are all empty.                  |
| `color`       | `string \| null \| undefined` | Input to the swatch + localized name rendering. May be a hex (`"#FFFFFF"`), a legacy free-text value, or null. No transformation is applied on persist. |

---

## 2. Presentation entities (in-memory only)

### 2.1 `SwatchVariant` (new export, previously file-local)

A discriminant describing which swatch visual to render. Shape preserved exactly as it exists today inside `color-select.tsx`.

```ts
type SwatchVariant = "none" | "flat" | "legacy" | "chameleon" | "chrome";
```

| Variant      | When                                                       | Visual                                                    |
|--------------|------------------------------------------------------------|-----------------------------------------------------------|
| `none`       | Color is missing / empty                                   | Nothing rendered                                          |
| `flat`       | Color is a canonical hex (catalog or custom)               | Solid circle at that hex                                  |
| `legacy`     | Color is a non-hex free-text string                        | Dashed-border empty circle (placeholder)                  |
| `chameleon`  | Catalog entry whose `effect === "chameleon"`               | Conic-gradient circle                                     |
| `chrome`     | Catalog entry whose `effect === "chrome"`                  | Linear-gradient circle                                    |

### 2.2 `ResolvedSwatch` (new return shape, derived from `computeTriggerDisplay`)

```ts
interface ResolvedSwatch {
  variant: SwatchVariant;
  color: string | null;   // hex to paint (flat/legacy/effects), or null for non-flat variants
  label: string;          // localized color name, or canonical hex for custom hex, or raw string for legacy, or empty string when color is missing
}
```

`color === null` for `variant === "chameleon"` and `variant === "chrome"` — the gradient is CSS-driven, no hex needed. `label === ""` when `variant === "none"`.

### 2.3 `Vehicle` label output (pure string)

```ts
function formatVehicleLabel(v: Vehicle): string;
```

Returns **only** the vehicle identity — brand, model, plate — joined as `"Brand Model — PLATE"`. Missing parts are omitted gracefully; if all three are empty/null, returns `v.vehicleType` as the fallback. **Does not include the color.** The swatch and color name are rendered by the caller as siblings, not embedded in this string.

Examples:

| Input                                                                           | Output                      |
|---------------------------------------------------------------------------------|-----------------------------|
| `{ brand: "Toyota", model: "Avanza", plate: "HASD-123", color: "#FFFFFF", vehicleType: "car" }` | `"Toyota Avanza — HASD-123"` |
| `{ brand: "Toyota", model: null, plate: null, color: null, vehicleType: "car" }` | `"Toyota"`                   |
| `{ brand: null, model: null, plate: null, color: null, vehicleType: "motorcycle" }` | `"motorcycle"`            |
| `{ brand: "Honda", model: "Civic", plate: null, color: "#FF0000", vehicleType: "car" }` | `"Honda Civic"`              |

---

## 3. Public surface (exports introduced by this feature)

All exports are added to `@ramcar/features`. Consumers in `apps/web` and `apps/desktop` import by subpath.

### 3.1 `@ramcar/features/shared/color-select`

Additions to the existing module barrel (`packages/features/src/shared/color-select/index.ts`):

| Export                          | Kind       | Signature                                                                                     | Purpose                                                                                        |
|---------------------------------|------------|-----------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|
| `Swatch`                        | Component  | `({ variant: SwatchVariant, color: string \| null }) => JSX.Element \| null`                  | Renders a single swatch dot. Returns `null` for `variant === "none"`.                         |
| `SwatchVariant`                 | Type       | `"none" \| "flat" \| "legacy" \| "chameleon" \| "chrome"`                                     | Discriminant for `<Swatch />`.                                                                |
| `resolveSwatch`                 | Function   | `(colorValue: string \| null \| undefined, t: (key: string) => string) => ResolvedSwatch`      | One-shot "give me everything I need to render a color at a glance" for an arbitrary color value. |
| `ResolvedSwatch`                | Type       | `{ variant: SwatchVariant; color: string \| null; label: string }`                             | Return shape of `resolveSwatch`.                                                              |

All pre-existing exports (`ColorSelect`, `ColorSelectProps`, `COLOR_CATALOG`, etc.) remain unchanged.

### 3.2 `@ramcar/features/shared/vehicle-label` *(new)*

New module barrel (`packages/features/src/shared/vehicle-label/index.ts`):

| Export                 | Kind     | Signature                         | Purpose                                                            |
|------------------------|----------|-----------------------------------|--------------------------------------------------------------------|
| `formatVehicleLabel`   | Function | `(v: Vehicle) => string`          | Single source of truth for the "Brand Model — PLATE" identity line. |

`Vehicle` is the existing type (from `@ramcar/shared` for the two app forms; from `packages/features/src/visitors/types` for the shared visitor form). Because the two sources share the relevant field surface (`brand`, `model`, `plate`, `vehicleType`), the helper is typed against a minimal structural interface (see §4).

### 3.3 `packages/features/package.json`

```json
"exports": {
  "...": "...",
  "./shared/vehicle-label": "./src/shared/vehicle-label/index.ts"
}
```

No change to existing `exports` entries.

---

## 4. Structural typing for `formatVehicleLabel`

To keep the helper reusable across the two different `Vehicle` types in play (visitors-scoped and `@ramcar/shared`-scoped), it is typed against a minimal structural interface:

```ts
interface VehicleLabelInput {
  brand?: string | null;
  model?: string | null;
  plate?: string | null;
  vehicleType: string;
}

export function formatVehicleLabel(v: VehicleLabelInput): string;
```

Both existing `Vehicle` types already satisfy this shape; no type casts are needed at call sites.

---

## 5. State transitions

None. This feature has no state — it is a pure transformation from vehicle data to presentation output, computed fresh on every render.

---

## 6. Validation rules

None. No input validation is introduced. Inputs (hex colors, vehicle records) come from data already validated upstream by the API/Zod schemas.
