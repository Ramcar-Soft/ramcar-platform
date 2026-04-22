# Color Select — Shared Component Design

**Date:** 2026-04-21
**Status:** Approved (design)
**Author:** Ivan (with Claude)
**Scope:** `packages/features/src/shared/color-select/` + new primitives in `@ramcar/ui`

## Summary

Replace the free-text vehicle color input with a searchable, grouped, keyboard-navigable dropdown that shows 100 curated vehicle colors organized into 7 categories, with a native color picker escape hatch for custom colors. The component is authored once in the cross-app shared package and consumed by both the web portal and the desktop guard booth. Storage remains a single string column — new values are stored as uppercase HEX (`#RRGGBB`); legacy free-text values are tolerated on read without migration.

## Decisions locked during brainstorming

| ID | Question | Decision |
|---|---|---|
| Q1 | Legacy data handling | Store HEX going forward; tolerate legacy free-text strings on read, display them with a neutral indicator. No DB migration. |
| Q2 | Custom color semantics | One-off per vehicle. Not persisted in a user/tenant palette. |
| Q3 | Catalog contents | 100 curated vehicle colors grouped into 7 categories (20/15/15/13/13/12/12). See "Color Catalog" below. |
| Q3b | Finish-variant swatch rendering | Accepted — matte/metallic/pearl/satin variants share a visual family but each entry gets a slightly distinct HEX so the reverse-lookup is 1:1. |
| Q3c | Chameleon / chrome entries | Rendered with a gradient/striped swatch (option ii). 4 entries flagged with `effect` field. |
| Q4 | Search matching | Match against localized label (current locale) + other-locale label + raw HEX code. Case-insensitive, accent-insensitive, substring. |
| Q5 | Primitive placement | Add `Command` + `Popover` to `@ramcar/ui` (reusable primitives); compose `ColorSelect` on top of them. |

## Placement and Architecture

### Why `packages/features/src/shared/`

- Sits beside `vehicle-type-select.tsx`, which is its closest structural cousin (domain-flavored select used by `vehicle-form.tsx`).
- No Next.js / Electron dependencies — compatible with both host apps.
- Uses the `useI18n` adapter that host apps wire to `next-intl` (web) and `react-i18next` (desktop).
- Not a generic primitive (it carries a 100-entry catalog and domain semantics) — so not a fit for `@ramcar/ui`.
- Not a domain entity (no API/validator consumes the catalog) — so not a fit for `@ramcar/shared`.

### File layout

```
packages/features/src/shared/color-select/
├── color-select.tsx          # Main ColorSelect component
├── color-catalog.ts          # The 100 curated entries (key, hex, category, effect?)
├── color-lookup.ts           # HEX normalization + reverse-lookup + search helpers
├── __tests__/
│   ├── color-catalog.test.ts
│   ├── color-lookup.test.ts
│   └── color-select.test.tsx
└── index.ts                  # Re-exports ColorSelect + catalog + types
```

`packages/features/src/shared/index.ts` gains `export * from "./color-select"`.

### New primitives in `@ramcar/ui`

Run inside `packages/ui/`:

```bash
pnpx shadcn@latest add command popover
```

Add to `packages/ui/src/index.ts`:

```ts
export * from "./components/ui/command";
export * from "./components/ui/popover";
```

These primitives are generic and will be reused by future comboboxes (e.g., upgrading `resident-select.tsx` when tenants grow large).

## Public API

```ts
interface ColorSelectProps {
  value: string | null;                  // HEX ("#C8102E") | legacy free-text | null
  onChange: (hex: string | null) => void;
  placeholder?: string;                  // Default: t("vehicles.color.placeholder")
  disabled?: boolean;
  id?: string;                           // For external <Label htmlFor>
  ariaLabel?: string;                    // Default: t("vehicles.color.ariaLabel")
}
```

**Value contract:**

- `onChange` emits `"#RRGGBB"` (uppercase, 7 chars) for any curated or custom pick.
- `onChange` emits `null` when the user clears the selection.
- `onChange` never emits a legacy free-text string. Legacy values are only ever **read** through `value`. Once the user edits, the legacy string is replaced by a HEX value.
- Consumers continue to store the result as a plain string. The Zod validator (`z.string().max(50).optional()`) is unchanged.

**Pattern alignment:** Matches `VehicleTypeSelect`'s contract (`value`, `onChange`, consumer wraps with its own `<Label>`).

## Color Catalog

The catalog is a typed array in `color-catalog.ts`:

```ts
export type ColorCategory =
  | "neutrals"
  | "blues"
  | "reds"
  | "greens"
  | "yellowsOranges"
  | "earth"
  | "premium";

export type ColorEffect = "chameleon" | "chrome";

export interface ColorEntry {
  key: string;            // stable i18n key, e.g. "solid_red"
  hex: string;            // uppercase "#RRGGBB"
  category: ColorCategory;
  effect?: ColorEffect;   // only set for the 4 non-flat entries
}

export const COLOR_CATALOG: readonly ColorEntry[] = [ /* 100 entries */ ];
```

### Full 100-color list

#### Neutrals (20)

| # | key | ES | EN | HEX |
|---|---|---|---|---|
| 1 | `white` | Blanco | White | `#FFFFFF` |
| 2 | `pearl_white` | Blanco perlado | Pearl white | `#F8F6F0` |
| 3 | `ivory_white` | Blanco marfil | Ivory white | `#FFFFF0` |
| 4 | `black` | Negro | Black | `#000000` |
| 5 | `gloss_black` | Negro brillante | Gloss black | `#0A0A0A` |
| 6 | `matte_black` | Negro mate | Matte black | `#1C1C1C` |
| 7 | `obsidian_black` | Negro obsidiana | Obsidian black | `#0B0B0D` |
| 8 | `silver_gray` | Gris plata | Silver gray | `#C0C0C0` |
| 9 | `dark_gray` | Gris oscuro | Dark gray | `#4A4A4A` |
| 10 | `graphite_gray` | Gris grafito | Graphite gray | `#383A3D` |
| 11 | `steel_gray` | Gris acero | Steel gray | `#7A8084` |
| 12 | `cement_gray` | Gris cemento | Cement gray | `#8D8D8D` |
| 13 | `matte_gray` | Gris mate | Matte gray | `#6E6E6E` |
| 14 | `metallic_silver` | Plata metálico | Metallic silver | `#B8B8B8` |
| 15 | `aluminum_silver` | Plata aluminio | Aluminum silver | `#D0D2D4` |
| 16 | `titanium_silver` | Plata titanio | Titanium silver | `#A9A9A9` |
| 17 | `satin_silver` | Plata satinado | Satin silver | `#BFC1C2` |
| 18 | `light_gray` | Gris claro | Light gray | `#BEBEBE` |
| 19 | `blue_gray` | Gris azulado | Blue gray | `#6E7B8B` |
| 20 | `charcoal_gray` | Gris carbón | Charcoal gray | `#36454F` |

#### Blues (15)

| # | key | ES | EN | HEX |
|---|---|---|---|---|
| 21 | `navy_blue` | Azul marino | Navy blue | `#1B263B` |
| 22 | `royal_blue` | Azul rey | Royal blue | `#002366` |
| 23 | `electric_blue` | Azul eléctrico | Electric blue | `#0892D0` |
| 24 | `sky_blue` | Azul cielo | Sky blue | `#87CEEB` |
| 25 | `deep_blue` | Azul profundo | Deep blue | `#002B5C` |
| 26 | `metallic_blue` | Azul metálico | Metallic blue | `#2E5090` |
| 27 | `pearl_dark_blue` | Azul oscuro perlado | Pearl dark blue | `#0B1F3A` |
| 28 | `cobalt_blue` | Azul cobalto | Cobalt blue | `#0047AB` |
| 29 | `petrol_blue` | Azul petróleo | Petrol blue | `#005F6A` |
| 30 | `indigo_blue` | Azul índigo | Indigo blue | `#4B0082` |
| 31 | `turquoise_blue` | Azul turquesa | Turquoise blue | `#30D5C8` |
| 32 | `aqua_blue` | Azul aqua | Aqua blue | `#00E5E5` |
| 33 | `matte_blue` | Azul mate | Matte blue | `#3B5B7D` |
| 34 | `steel_blue` | Azul acero | Steel blue | `#4682B4` |
| 35 | `midnight_blue` | Azul medianoche | Midnight blue | `#191970` |

#### Reds (15)

| # | key | ES | EN | HEX |
|---|---|---|---|---|
| 36 | `solid_red` | Rojo sólido | Solid red | `#C8102E` |
| 37 | `bright_red` | Rojo brillante | Bright red | `#E31B23` |
| 38 | `cherry_red` | Rojo cereza | Cherry red | `#B0141E` |
| 39 | `wine_red` | Rojo vino | Wine red | `#722F37` |
| 40 | `carmine_red` | Rojo carmín | Carmine red | `#960018` |
| 41 | `scarlet_red` | Rojo escarlata | Scarlet red | `#FF2400` |
| 42 | `metallic_red` | Rojo metálico | Metallic red | `#B22222` |
| 43 | `pearl_red` | Rojo perlado | Pearl red | `#B32B2B` |
| 44 | `dark_red` | Rojo oscuro | Dark red | `#5C0A0A` |
| 45 | `brick_red` | Rojo ladrillo | Brick red | `#8B3A3A` |
| 46 | `orange_red` | Rojo anaranjado | Orange red | `#D2381F` |
| 47 | `burgundy_red` | Rojo burdeos | Burgundy red | `#800020` |
| 48 | `ruby_red` | Rojo rubí | Ruby red | `#9B111E` |
| 49 | `matte_red` | Rojo mate | Matte red | `#8F1D1D` |
| 50 | `racing_red` | Rojo racing | Racing red | `#D62828` |

#### Greens (13)

| # | key | ES | EN | HEX |
|---|---|---|---|---|
| 51 | `olive_green` | Verde oliva | Olive green | `#556B2F` |
| 52 | `military_green` | Verde militar | Military green | `#4B5320` |
| 53 | `bottle_green` | Verde botella | Bottle green | `#006A4E` |
| 54 | `dark_green` | Verde oscuro | Dark green | `#0B3D0B` |
| 55 | `lime_green` | Verde lima | Lime green | `#32CD32` |
| 56 | `bright_green` | Verde brillante | Bright green | `#2ECC71` |
| 57 | `metallic_green` | Verde metálico | Metallic green | `#355E3B` |
| 58 | `emerald_green` | Verde esmeralda | Emerald green | `#50C878` |
| 59 | `jade_green` | Verde jade | Jade green | `#00A86B` |
| 60 | `matte_green` | Verde mate | Matte green | `#4A6741` |
| 61 | `forest_green` | Verde bosque | Forest green | `#228B22` |
| 62 | `mint_green` | Verde menta | Mint green | `#98FF98` |
| 63 | `acid_green` | Verde ácido | Acid green | `#B0BF1A` |

#### Yellows & Oranges (13)

| # | key | ES | EN | HEX |
|---|---|---|---|---|
| 64 | `solid_yellow` | Amarillo sólido | Solid yellow | `#FFD400` |
| 65 | `bright_yellow` | Amarillo brillante | Bright yellow | `#FFEA00` |
| 66 | `canary_yellow` | Amarillo canario | Canary yellow | `#FFEF00` |
| 67 | `mustard_yellow` | Amarillo mostaza | Mustard yellow | `#D4A017` |
| 68 | `metallic_yellow` | Amarillo metálico | Metallic yellow | `#E5B80B` |
| 69 | `matte_yellow` | Amarillo mate | Matte yellow | `#C9A227` |
| 70 | `gold_yellow` | Amarillo dorado | Gold yellow | `#DAA520` |
| 71 | `bright_orange` | Naranja brillante | Bright orange | `#FF7F00` |
| 72 | `burnt_orange` | Naranja quemado | Burnt orange | `#CC5500` |
| 73 | `metallic_orange` | Naranja metálico | Metallic orange | `#C15A30` |
| 74 | `matte_orange` | Naranja mate | Matte orange | `#C8571F` |
| 75 | `copper_orange` | Naranja cobrizo | Copper orange | `#C46A24` |
| 76 | `flame_orange` | Naranja flama | Flame orange | `#E25822` |

#### Browns, Beige & Earth (12)

| # | key | ES | EN | HEX |
|---|---|---|---|---|
| 77 | `dark_brown` | Café oscuro | Dark brown | `#3E2723` |
| 78 | `light_brown` | Café claro | Light brown | `#8B5A2B` |
| 79 | `chocolate_brown` | Café chocolate | Chocolate brown | `#5C3317` |
| 80 | `metallic_brown` | Café metálico | Metallic brown | `#6F4E37` |
| 81 | `beige` | Beige | Beige | `#E8DCC4` |
| 82 | `sand` | Arena | Sand | `#C2B280` |
| 83 | `champagne` | Champagne | Champagne | `#F7E7CE` |
| 84 | `bronze` | Bronce | Bronze | `#CD7F32` |
| 85 | `metallic_bronze` | Bronce metálico | Metallic bronze | `#B08D57` |
| 86 | `gold` | Oro | Gold | `#FFD700` |
| 87 | `satin_gold` | Oro satinado | Satin gold | `#D4AF37` |
| 88 | `copper` | Cobre | Copper | `#B87333` |

#### Others / Premium (12)

| # | key | ES | EN | HEX | effect |
|---|---|---|---|---|---|
| 89 | `purple` | Morado | Purple | `#5D3FD3` | — |
| 90 | `dark_purple` | Morado oscuro | Dark purple | `#3B0764` | — |
| 91 | `metallic_purple` | Morado metálico | Metallic purple | `#6A0DAD` | — |
| 92 | `violet` | Violeta | Violet | `#8F00FF` | — |
| 93 | `magenta` | Magenta | Magenta | `#FF00FF` | — |
| 94 | `pink` | Rosa | Pink | `#FFC0CB` | — |
| 95 | `metallic_pink` | Rosa metálico | Metallic pink | `#E75480` | — |
| 96 | `quartz_pink` | Rosa cuarzo | Quartz pink | `#F7CAC9` | — |
| 97 | `chameleon_blue_purple` | Azul/morado camaleón | Chameleon blue/purple | `#6E4E9E` | `chameleon` |
| 98 | `chameleon_black` | Negro con efecto camaleón | Chameleon black | `#1A1A2E` | `chameleon` |
| 99 | `chrome_gray` | Gris con efecto cromado | Chrome gray | `#A8A9AD` | `chrome` |
| 100 | `chameleon_multicolor` | Camaleón multicolor | Chameleon multicolor | `#7F7F7F` | `chameleon` |

**Invariants enforced by `color-catalog.test.ts`:**
- Exactly 100 entries.
- All `key` values unique.
- All `hex` values unique (reverse-lookup is 1:1).
- All `hex` match `/^#[0-9A-F]{6}$/` (uppercase, 7 chars).
- Category counts: `neutrals=20, blues=15, reds=15, greens=13, yellowsOranges=13, earth=12, premium=12`.
- The 4 `effect`-flagged entries are all in `premium`.

## Trigger Display (closed state)

The trigger is a `Button` that acts as the `Popover` anchor. Layout: `[swatch] [label] [chevron]` with `gap-2`. Content depends on the current `value`:

| Value state | Swatch | Label | Notes |
|---|---|---|---|
| `null` or `""` | none | `t("vehicles.color.placeholder")` in muted color | — |
| Curated HEX (in catalog) | flat color circle | localized color name | e.g., `Rojo sólido` |
| Custom HEX (not in catalog) | flat color circle | the HEX code itself, e.g. `#7A4B2C` | — |
| Legacy free-text | neutral dashed-ring circle (no fill) | raw string | Tooltip on hover: `t("vehicles.color.legacyHint")`. No auto-rewrite. |
| Chameleon entry | conic-gradient circle | localized name | Uses `background: conic-gradient(...)` on the swatch |
| Chrome entry | diagonal-stripe circle | localized name | Uses `background: linear-gradient(...)` with chrome stops |

Swatch CSS: `h-4 w-4 rounded-full border border-border` (the border keeps white/ivory circles visible on light themes and black circles visible on dark themes). Chevron: `ml-auto h-4 w-4` from `lucide-react`.

## Open-state Popover Content

`PopoverContent` uses `w-[--radix-popover-trigger-width]` so the dropdown matches the trigger's width. Vertical layout:

1. **Search input** (`CommandInput`) at the top. Auto-focused on open. Placeholder: `t("vehicles.color.searchPlaceholder")`.
2. **"Add custom color" row** (sticky as the first item below the search).
   - Label: `t("vehicles.color.addCustom")` (ES: `+ Agregar color personalizado`).
   - Click or Enter while highlighted → programmatically `click()` a hidden `<input type="color">` — the browser's basic native color picker.
   - On the hidden input's `change` event, the chosen HEX is uppercased, emitted via `onChange`, and the popover closes.
3. **"Current" row** (conditionally, only if `value` is set and is not a catalog HEX) — lets the user see and re-pick the current custom color. Label: `t("vehicles.color.current")` + the current value.
4. **Grouped curated list** — 7 `CommandGroup` sections in catalog order (`neutrals`, `blues`, `reds`, `greens`, `yellowsOranges`, `earth`, `premium`). Each group header uses `t("vehicles.color.categories.<category>")`. Each row is a `CommandItem` rendering `[swatch] [localized name]`.
5. **Empty state** — `CommandEmpty` displays when search has no matches: `t("vehicles.color.noResults", { query })` ("No colors match '{query}' — try Add custom color above").

### Search filter

Search is implemented through `Command`'s built-in filter. Each `CommandItem` gets `value={buildSearchToken(entry)}` where `buildSearchToken` concatenates the normalized EN label, the normalized ES label, and the HEX (lowercased), separated by spaces. The normalization is:

```ts
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // strip combining diacritical marks (U+0300–U+036F)
}
```

This makes `"cafe"` match `Café`, `"oscuro"` match all four `*_oscuro` entries, and `#ff0000`-style HEX queries work against the catalog entries (even though no entry is exactly `#FF0000`, partial matches still behave).

### Keyboard behavior (inherited from shadcn `Command`)

- `ArrowDown` / `ArrowUp` — navigate highlighted item, wrapping at ends.
- `Enter` — select the currently highlighted item (emits its HEX via `onChange` and closes).
- When "Add custom color" is highlighted, `Enter` triggers the native picker instead.
- `Esc` — close popover.
- Typing — filters the list and auto-highlights the first match.

## Integration Points

Two files change in this project. No other consumer requires updates.

### 1. `packages/features/src/shared/vehicle-form/vehicle-form.tsx`

Replace lines 137–144 (the color `<Input>`):

```tsx
<div className="space-y-2">
  <Label>{t("vehicles.color.label")}</Label>
  <ColorSelect
    value={color || null}
    onChange={(hex) => {
      const v = hex ?? "";
      setColor(v);
      notify("color", v);
    }}
  />
</div>
```

Keep the surrounding `<Label>`, the `color` state shape, the draft notification plumbing, and the Zod validator unchanged.

### 2. `packages/features/src/visitors/components/visit-person-access-event-form.tsx`

The helper near lines 36–43 that renders `${parts}${plate}${color}` is read-only. Optional enhancement: resolve `v.color` through `lookupByHex` and render a small swatch next to the parenthetical. If `lookupByHex` returns `null` (custom HEX or legacy string), render the raw string as today. This enhancement is low-risk and optional; if shipping it simplifies the review cycle it can be deferred to a follow-up.

### No other changes

- **No API changes.** The `/vehicles` endpoint still accepts `color: string | null`.
- **No DB migration.** The `vehicles.color` column is still a nullable text column; existing rows remain untouched.
- **No validator changes.** `createVehicleSchema` keeps `color: z.string().max(50).optional().or(z.literal(""))`.
- **No desktop outbox changes.** The wire format is unchanged, so `vehicles-handlers` and the outbox serializer work as-is.
- **No updates to generated types.** `@ramcar/db-types` still sees `color: string | null`.

## i18n Keys

All keys added to both `packages/i18n/src/messages/en.json` and `packages/i18n/src/messages/es.json` under the existing `vehicles.color` namespace.

```
vehicles.color.label                  (exists — "Color", unchanged)
vehicles.color.placeholder            → "Select a color" / "Selecciona un color"      (existing key redefined)
vehicles.color.searchPlaceholder      → "Search colors..." / "Buscar colores..."      (new)
vehicles.color.addCustom              → "+ Add custom color" / "+ Agregar color personalizado"  (new)
vehicles.color.current                → "Current" / "Actual"                          (new)
vehicles.color.noResults              → "No colors match '{query}'" / "Ningún color coincide con '{query}'"  (new, supports {query} interpolation)
vehicles.color.legacyHint             → "Stored as free text — select a color to update" / "Guardado como texto libre — selecciona un color para actualizar"  (new)
vehicles.color.ariaLabel              → "Color picker" / "Selector de color"          (new)

vehicles.color.categories.neutrals        → "Neutrals" / "Neutros"
vehicles.color.categories.blues           → "Blues" / "Azules"
vehicles.color.categories.reds            → "Reds" / "Rojos"
vehicles.color.categories.greens          → "Greens" / "Verdes"
vehicles.color.categories.yellowsOranges  → "Yellows & oranges" / "Amarillos y naranjas"
vehicles.color.categories.earth           → "Browns, beige & earth" / "Cafés, beige y tierra"
vehicles.color.categories.premium         → "Others / premium" / "Otros / premium"

vehicles.color.options.<key>          → 100 entries, one per curated color (see "Color Catalog" table for EN/ES values)
```

Host apps pick up the new keys automatically through the `useI18n` adapter (web: `next-intl`; desktop: `react-i18next`), both of which consume the same `@ramcar/i18n` source.

## Testing Strategy

Unit tests live in `packages/features/src/shared/color-select/__tests__/`. All tests use Vitest.

### `color-catalog.test.ts`

- Exactly 100 entries.
- All keys unique.
- All HEX values unique.
- All HEX values match `/^#[0-9A-F]{6}$/`.
- Category counts match: 20 / 15 / 15 / 13 / 13 / 12 / 12.
- The 4 effect-flagged entries (`chameleon_blue_purple`, `chameleon_black`, `chrome_gray`, `chameleon_multicolor`) have `category === "premium"` and a defined `effect` field.

### `color-lookup.test.ts`

- `normalizeHex("#fff")` → `"#FFFFFF"`.
- `normalizeHex("#c8102e")` → `"#C8102E"`.
- `normalizeHex("not-a-hex")` → `null`.
- `lookupByHex("#C8102E")` returns the `solid_red` entry.
- `lookupByHex("#c8102e")` (lowercase) returns the same entry.
- `lookupByHex("#7A4B2C")` (not in catalog) returns `null`.
- `buildSearchToken(entry)` concatenates normalized EN + normalized ES + lowercase HEX, space-separated.
- Normalization: `"café"` → `"cafe"`, `"Rojo Oscuro"` → `"rojo oscuro"`.

### `color-select.test.tsx`

Rendering:
- With `value === null`, trigger shows the placeholder and no swatch.
- With `value === "#C8102E"`, trigger shows the red swatch + `Rojo sólido` (Spanish test locale) / `Solid red` (English test locale).
- With `value === "#7A4B2C"` (custom), trigger shows a brown swatch + the literal HEX.
- With `value === "blanco metalizado"` (legacy free text), trigger shows the neutral-ring indicator + the raw string.

Interaction:
- Clicking the trigger opens the popover and focuses the search input.
- Typing `"rojo"` filters to red-family entries; typing `"#c8102e"` filters to `solid_red`.
- Arrow-down + Enter selects the highlighted item; `onChange` is called with its uppercase HEX; the popover closes.
- Clicking "Add custom color" invokes `HTMLInputElement.prototype.click` on the hidden color input (asserted via spy).
- Simulating a `change` event on the hidden color input with a HEX value emits that HEX (uppercased) via `onChange` and closes the popover.
- `Esc` closes the popover without changing value.

No E2E additions are required. The existing Playwright vehicle-form flow will continue to pass because the form still writes a string to the `color` field. If any E2E test types a free-text color, it is rewritten to open the popover and pick a curated entry.

## Accessibility & Visual Edge Cases

- The trigger exposes `aria-label` from the prop, falling back to `t("vehicles.color.ariaLabel")`.
- Swatch circles are decorative (`aria-hidden="true"`); screen readers hear only the color name.
- The trigger is focusable via Tab. The popover is closed by default, so Enter in other form fields still submits the form normally.
- The hidden `<input type="color">` element is `sr-only` and absolutely positioned off-screen; the "Add custom color" `CommandItem` opens it programmatically. This avoids the ugly default color-swatch button that Chrome renders for visible `type="color"` inputs.
- Contrast: white / ivory / pearl swatches get a visible `border border-border` so they stay circular on a light trigger background. Black / obsidian swatches get the same border so they stay circular on a dark theme.
- Chameleon swatch: CSS `background: conic-gradient(from 0deg, <three premium family hues>)`. Chrome swatch: `background: linear-gradient(135deg, #d8d9dc 0%, #7d7e82 50%, #d8d9dc 100%)`. Both are pure CSS — zero image assets.
- When the popover's virtual height exceeds the viewport, `CommandList` scrolls; ArrowDown/Up keep the highlighted item in view via shadcn's built-in scroll-into-view behavior.

## Cross-App Shared Module Compliance (spec 014)

This work adheres to the shared-feature rules enforced by `pnpm check:shared-features`:

- No `"use client";` directive in the component.
- No `next/*` imports.
- No `window.electron`, Node-in-renderer APIs, or IPC usage.
- i18n comes through the `useI18n` adapter — no direct `next-intl` or `react-i18next` import.
- No transport / fetch code (the component is pure presentation).
- Catalog is a module-level constant; no runtime dependency on an API.

## Risks and Open Considerations

- **Finish variants look visually similar.** Users who care about differentiating matte / metallic / pearl / solid may not rely on visual differentiation alone. The name label is authoritative. Acceptable per Q3b.
- **Chameleon swatches are approximations.** The gradient depiction is a hint, not an accurate rendering of a real chameleon paint. Legacy free-text entries that describe chameleon paints in plain prose stay as-is until the user edits.
- **Future consideration — persisted custom palette.** If usage shows that guards/admins enter custom HEX values frequently (say, >20% of new vehicles), a future spec can add `tenant_custom_vehicle_colors` per Q2 option (c). No work is needed now; the data contract (HEX string) is forward-compatible with that extension.
- **`resident-select.tsx` upgrade.** Adding `Command`+`Popover` to `@ramcar/ui` as part of this work makes it straightforward to later upgrade `resident-select` from a `Select` to a searchable combobox. Out of scope for this spec.

## Delivery Checklist (to be expanded by writing-plans)

The implementation plan (produced next) will cover at minimum:

1. Install `Command` and `Popover` in `packages/ui`; re-export from `packages/ui/src/index.ts`.
2. Add `color-catalog.ts` and `color-lookup.ts` with unit tests.
3. Build `color-select.tsx`; wire grouped rendering, keyboard, native picker, legacy handling.
4. Export from `packages/features/src/shared/index.ts`.
5. Add i18n keys to `packages/i18n/src/messages/{en,es}.json`.
6. Swap the `<Input>` in `vehicle-form.tsx` for `<ColorSelect>`.
7. (Optional) Enhance `visit-person-access-event-form.tsx` display helper to render a swatch.
8. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm check:shared-features`.
9. Manual smoke test: web (Spanish locale) → pick curated color → save → reopen → displayed. Desktop → same flow.
