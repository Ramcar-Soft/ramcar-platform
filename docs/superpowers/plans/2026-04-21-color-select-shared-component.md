# Color Select Shared Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free-text vehicle color input with a searchable, grouped, keyboard-navigable color dropdown (100 curated colors + native-picker escape hatch), authored once in `packages/features` and consumed by both the web and desktop apps. No DB/API changes.

**Architecture:** One new shared component `ColorSelect` in `packages/features/src/shared/color-select/` backed by a static 100-entry catalog. Two shadcn primitives (`Command`, `Popover`) are added to `@ramcar/ui` to support this and future combobox work. Storage stays a plain `color: string | null` — catalog picks emit `"#RRGGBB"`, the "Add custom color" option opens `<input type="color">` for custom HEX, legacy free-text values are rendered read-only until the user edits. Test-first (Vitest + jsdom + Testing Library) for every slice.

**Tech Stack:** React 19, TypeScript 5 (strict), shadcn (`radix-ui` + `cmdk`), Tailwind CSS 4, Vitest 2, Testing Library, `@ramcar/ui` + `@ramcar/i18n` + `@ramcar/features/adapters`.

**Reference spec:** `docs/superpowers/specs/2026-04-21-color-select-shared-component-design.md`

**Codebase pre-flight (known facts for the implementer):**
- `packages/features` runs Vitest with jsdom. Test harness: `packages/features/src/test/harness.tsx` exports `renderWithHarness(ui, overrides)`; the mock `I18nPort` returns the key itself from `t(key)`, so assertions can match on key strings.
- Existing shared primitives follow the pattern in `packages/features/src/shared/vehicle-form/vehicle-type-select.tsx` — a small component that reads `useI18n` from `../../adapters`, wraps shadcn primitives from `@ramcar/ui`, and is consumed by `vehicle-form.tsx`.
- `packages/ui` uses `"style": "new-york"` in `components.json`, imports Radix as the consolidated `radix-ui` package (e.g. `import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"`), and exports everything flat from `packages/ui/src/index.ts`.
- `packages/features/package.json` has per-subdirectory `exports` — adding a new shared component requires adding an `exports` entry for it.
- The current `vehicles.color` block in both `packages/i18n/src/messages/en.json` and `es.json` is `{ "label": "...", "placeholder": "..." }` and starts around line 259 of each file.
- `CLAUDE.md` rules: commit ONLY when the user explicitly asks. **Each task ends with "Commit" steps, but the AI executor should pause and ask before running git commit unless the user preamble explicitly authorized unattended commits.**

**File impact map:**

| File | Change |
|---|---|
| `packages/ui/src/components/ui/command.tsx` | **new** — from shadcn CLI |
| `packages/ui/src/components/ui/popover.tsx` | **new** — from shadcn CLI |
| `packages/ui/src/index.ts` | **modify** — add re-exports |
| `packages/ui/package.json` | **modify** — `cmdk` dep added (by shadcn CLI or manually) |
| `packages/features/package.json` | **modify** — add `./shared/color-select` export entry |
| `packages/features/src/shared/color-select/color-catalog.ts` | **new** |
| `packages/features/src/shared/color-select/color-lookup.ts` | **new** |
| `packages/features/src/shared/color-select/color-select.tsx` | **new** |
| `packages/features/src/shared/color-select/index.ts` | **new** |
| `packages/features/src/shared/color-select/__tests__/color-catalog.test.ts` | **new** |
| `packages/features/src/shared/color-select/__tests__/color-lookup.test.ts` | **new** |
| `packages/features/src/shared/color-select/__tests__/color-select.test.tsx` | **new** |
| `packages/features/src/shared/index.ts` | **modify** — add ColorSelect + types re-export |
| `packages/features/src/shared/vehicle-form/vehicle-form.tsx` | **modify** — swap `<Input>` for `<ColorSelect>` |
| `packages/i18n/src/messages/en.json` | **modify** — expand `vehicles.color` block |
| `packages/i18n/src/messages/es.json` | **modify** — expand `vehicles.color` block |

---

## Task 1: Add `Command` and `Popover` primitives to `@ramcar/ui`

**Files:**
- Create: `packages/ui/src/components/ui/command.tsx` (via shadcn CLI)
- Create: `packages/ui/src/components/ui/popover.tsx` (via shadcn CLI)
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/ui/package.json` (ensure `cmdk` dep present)

- [ ] **Step 1: Run shadcn CLI inside `packages/ui`**

```bash
cd packages/ui && pnpx shadcn@latest add command popover --yes
```

Expected: two new files appear under `packages/ui/src/components/ui/` (`command.tsx`, `popover.tsx`). The CLI may print "Adding dependency cmdk" — that's fine.

- [ ] **Step 2: Verify `cmdk` was installed; if not, install manually**

```bash
grep -q '"cmdk"' packages/ui/package.json && echo OK || pnpm --filter @ramcar/ui add cmdk@^1.0.0
```

Expected: `OK` printed, OR the add command runs and adds `cmdk` to `packages/ui/package.json` dependencies.

- [ ] **Step 3: Normalize the Radix import style in the generated files (if needed)**

The existing `@ramcar/ui` components import Radix as the consolidated package (`import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"`). Shadcn's default template may emit `import * as PopoverPrimitive from "@radix-ui/react-popover"`. Check both new files and rewrite if necessary:

Read `packages/ui/src/components/ui/popover.tsx`. If the top of the file imports `@radix-ui/react-popover`, replace with:

```tsx
import { Popover as PopoverPrimitive } from "radix-ui";
```

Then update all references (`PopoverPrimitive.Root`, `PopoverPrimitive.Trigger`, etc.) — these stay identical because the consolidated package re-exports the same member names. `command.tsx` uses `cmdk` directly, so no change needed there.

- [ ] **Step 4: Re-export from the package barrel**

Modify `packages/ui/src/index.ts`. After the existing `Dialog…` export block (around line 103), add:

```tsx
export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
} from "./components/ui/popover";
export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "./components/ui/command";
```

Note: the exact set of exports must match what shadcn generated; verify by reading the bottom of the generated files and copy the exported names. Adjust the list above if shadcn's generated barrel differs.

- [ ] **Step 5: Verify the package builds and types resolve**

```bash
pnpm --filter @ramcar/ui typecheck
```

Expected: exit 0, no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/components/ui/command.tsx packages/ui/src/components/ui/popover.tsx packages/ui/src/index.ts packages/ui/package.json pnpm-lock.yaml
git commit -m "feat(ui): add Command and Popover primitives"
```

---

## Task 2: Build the color catalog (TDD)

**Files:**
- Create: `packages/features/src/shared/color-select/color-catalog.ts`
- Create: `packages/features/src/shared/color-select/__tests__/color-catalog.test.ts`
- Modify: `packages/features/package.json` (add `./shared/color-select` to `exports`)

- [ ] **Step 1: Add the subpath export in `packages/features/package.json`**

Under `"exports"`, after `"./shared/resident-select"`:

```json
    "./shared/resident-select": "./src/shared/resident-select/index.tsx",
    "./shared/color-select": "./src/shared/color-select/index.ts"
  },
```

- [ ] **Step 2: Write the failing catalog tests**

Create `packages/features/src/shared/color-select/__tests__/color-catalog.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { COLOR_CATALOG, COLOR_CATEGORIES } from "../color-catalog";

describe("COLOR_CATALOG", () => {
  it("contains exactly 100 entries", () => {
    expect(COLOR_CATALOG).toHaveLength(100);
  });

  it("has unique keys", () => {
    const keys = COLOR_CATALOG.map((e) => e.key);
    expect(new Set(keys).size).toBe(100);
  });

  it("has unique HEX values (reverse-lookup must be 1:1)", () => {
    const hexes = COLOR_CATALOG.map((e) => e.hex);
    expect(new Set(hexes).size).toBe(100);
  });

  it("all HEX values are uppercase 7-char codes", () => {
    for (const entry of COLOR_CATALOG) {
      expect(entry.hex).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("every entry has a valid category", () => {
    for (const entry of COLOR_CATALOG) {
      expect(COLOR_CATEGORIES).toContain(entry.category);
    }
  });

  it("category counts match: 20/15/15/13/13/12/12", () => {
    const counts: Record<string, number> = {};
    for (const entry of COLOR_CATALOG) {
      counts[entry.category] = (counts[entry.category] ?? 0) + 1;
    }
    expect(counts).toEqual({
      neutrals: 20,
      blues: 15,
      reds: 15,
      greens: 13,
      yellowsOranges: 13,
      earth: 12,
      premium: 12,
    });
  });

  it("only the 4 premium effect entries carry an effect field", () => {
    const withEffect = COLOR_CATALOG.filter((e) => e.effect !== undefined);
    expect(withEffect.map((e) => e.key).sort()).toEqual([
      "chameleon_black",
      "chameleon_blue_purple",
      "chameleon_multicolor",
      "chrome_gray",
    ]);
    for (const entry of withEffect) {
      expect(entry.category).toBe("premium");
      expect(["chameleon", "chrome"]).toContain(entry.effect);
    }
  });
});
```

- [ ] **Step 3: Run the test; confirm it fails because the module does not exist**

```bash
pnpm --filter @ramcar/features test -- color-catalog
```

Expected: FAIL — `Cannot find module '../color-catalog'`.

- [ ] **Step 4: Create `color-catalog.ts` with the types and full 100-entry catalog**

Create `packages/features/src/shared/color-select/color-catalog.ts`:

```ts
export const COLOR_CATEGORIES = [
  "neutrals",
  "blues",
  "reds",
  "greens",
  "yellowsOranges",
  "earth",
  "premium",
] as const;

export type ColorCategory = (typeof COLOR_CATEGORIES)[number];

export type ColorEffect = "chameleon" | "chrome";

export interface ColorEntry {
  key: string;
  hex: string;
  category: ColorCategory;
  effect?: ColorEffect;
}

export const COLOR_CATALOG: readonly ColorEntry[] = [
  // Neutrals (20)
  { key: "white", hex: "#FFFFFF", category: "neutrals" },
  { key: "pearl_white", hex: "#F8F6F0", category: "neutrals" },
  { key: "ivory_white", hex: "#FFFFF0", category: "neutrals" },
  { key: "black", hex: "#000000", category: "neutrals" },
  { key: "gloss_black", hex: "#0A0A0A", category: "neutrals" },
  { key: "matte_black", hex: "#1C1C1C", category: "neutrals" },
  { key: "obsidian_black", hex: "#0B0B0D", category: "neutrals" },
  { key: "silver_gray", hex: "#C0C0C0", category: "neutrals" },
  { key: "dark_gray", hex: "#4A4A4A", category: "neutrals" },
  { key: "graphite_gray", hex: "#383A3D", category: "neutrals" },
  { key: "steel_gray", hex: "#7A8084", category: "neutrals" },
  { key: "cement_gray", hex: "#8D8D8D", category: "neutrals" },
  { key: "matte_gray", hex: "#6E6E6E", category: "neutrals" },
  { key: "metallic_silver", hex: "#B8B8B8", category: "neutrals" },
  { key: "aluminum_silver", hex: "#D0D2D4", category: "neutrals" },
  { key: "titanium_silver", hex: "#A9A9A9", category: "neutrals" },
  { key: "satin_silver", hex: "#BFC1C2", category: "neutrals" },
  { key: "light_gray", hex: "#BEBEBE", category: "neutrals" },
  { key: "blue_gray", hex: "#6E7B8B", category: "neutrals" },
  { key: "charcoal_gray", hex: "#36454F", category: "neutrals" },

  // Blues (15)
  { key: "navy_blue", hex: "#1B263B", category: "blues" },
  { key: "royal_blue", hex: "#002366", category: "blues" },
  { key: "electric_blue", hex: "#0892D0", category: "blues" },
  { key: "sky_blue", hex: "#87CEEB", category: "blues" },
  { key: "deep_blue", hex: "#002B5C", category: "blues" },
  { key: "metallic_blue", hex: "#2E5090", category: "blues" },
  { key: "pearl_dark_blue", hex: "#0B1F3A", category: "blues" },
  { key: "cobalt_blue", hex: "#0047AB", category: "blues" },
  { key: "petrol_blue", hex: "#005F6A", category: "blues" },
  { key: "indigo_blue", hex: "#4B0082", category: "blues" },
  { key: "turquoise_blue", hex: "#30D5C8", category: "blues" },
  { key: "aqua_blue", hex: "#00E5E5", category: "blues" },
  { key: "matte_blue", hex: "#3B5B7D", category: "blues" },
  { key: "steel_blue", hex: "#4682B4", category: "blues" },
  { key: "midnight_blue", hex: "#191970", category: "blues" },

  // Reds (15)
  { key: "solid_red", hex: "#C8102E", category: "reds" },
  { key: "bright_red", hex: "#E31B23", category: "reds" },
  { key: "cherry_red", hex: "#B0141E", category: "reds" },
  { key: "wine_red", hex: "#722F37", category: "reds" },
  { key: "carmine_red", hex: "#960018", category: "reds" },
  { key: "scarlet_red", hex: "#FF2400", category: "reds" },
  { key: "metallic_red", hex: "#B22222", category: "reds" },
  { key: "pearl_red", hex: "#B32B2B", category: "reds" },
  { key: "dark_red", hex: "#5C0A0A", category: "reds" },
  { key: "brick_red", hex: "#8B3A3A", category: "reds" },
  { key: "orange_red", hex: "#D2381F", category: "reds" },
  { key: "burgundy_red", hex: "#800020", category: "reds" },
  { key: "ruby_red", hex: "#9B111E", category: "reds" },
  { key: "matte_red", hex: "#8F1D1D", category: "reds" },
  { key: "racing_red", hex: "#D62828", category: "reds" },

  // Greens (13)
  { key: "olive_green", hex: "#556B2F", category: "greens" },
  { key: "military_green", hex: "#4B5320", category: "greens" },
  { key: "bottle_green", hex: "#006A4E", category: "greens" },
  { key: "dark_green", hex: "#0B3D0B", category: "greens" },
  { key: "lime_green", hex: "#32CD32", category: "greens" },
  { key: "bright_green", hex: "#2ECC71", category: "greens" },
  { key: "metallic_green", hex: "#355E3B", category: "greens" },
  { key: "emerald_green", hex: "#50C878", category: "greens" },
  { key: "jade_green", hex: "#00A86B", category: "greens" },
  { key: "matte_green", hex: "#4A6741", category: "greens" },
  { key: "forest_green", hex: "#228B22", category: "greens" },
  { key: "mint_green", hex: "#98FF98", category: "greens" },
  { key: "acid_green", hex: "#B0BF1A", category: "greens" },

  // Yellows & oranges (13)
  { key: "solid_yellow", hex: "#FFD400", category: "yellowsOranges" },
  { key: "bright_yellow", hex: "#FFEA00", category: "yellowsOranges" },
  { key: "canary_yellow", hex: "#FFEF00", category: "yellowsOranges" },
  { key: "mustard_yellow", hex: "#D4A017", category: "yellowsOranges" },
  { key: "metallic_yellow", hex: "#E5B80B", category: "yellowsOranges" },
  { key: "matte_yellow", hex: "#C9A227", category: "yellowsOranges" },
  { key: "gold_yellow", hex: "#DAA520", category: "yellowsOranges" },
  { key: "bright_orange", hex: "#FF7F00", category: "yellowsOranges" },
  { key: "burnt_orange", hex: "#CC5500", category: "yellowsOranges" },
  { key: "metallic_orange", hex: "#C15A30", category: "yellowsOranges" },
  { key: "matte_orange", hex: "#C8571F", category: "yellowsOranges" },
  { key: "copper_orange", hex: "#C46A24", category: "yellowsOranges" },
  { key: "flame_orange", hex: "#E25822", category: "yellowsOranges" },

  // Browns, beige & earth (12)
  { key: "dark_brown", hex: "#3E2723", category: "earth" },
  { key: "light_brown", hex: "#8B5A2B", category: "earth" },
  { key: "chocolate_brown", hex: "#5C3317", category: "earth" },
  { key: "metallic_brown", hex: "#6F4E37", category: "earth" },
  { key: "beige", hex: "#E8DCC4", category: "earth" },
  { key: "sand", hex: "#C2B280", category: "earth" },
  { key: "champagne", hex: "#F7E7CE", category: "earth" },
  { key: "bronze", hex: "#CD7F32", category: "earth" },
  { key: "metallic_bronze", hex: "#B08D57", category: "earth" },
  { key: "gold", hex: "#FFD700", category: "earth" },
  { key: "satin_gold", hex: "#D4AF37", category: "earth" },
  { key: "copper", hex: "#B87333", category: "earth" },

  // Others / premium (12)
  { key: "purple", hex: "#5D3FD3", category: "premium" },
  { key: "dark_purple", hex: "#3B0764", category: "premium" },
  { key: "metallic_purple", hex: "#6A0DAD", category: "premium" },
  { key: "violet", hex: "#8F00FF", category: "premium" },
  { key: "magenta", hex: "#FF00FF", category: "premium" },
  { key: "pink", hex: "#FFC0CB", category: "premium" },
  { key: "metallic_pink", hex: "#E75480", category: "premium" },
  { key: "quartz_pink", hex: "#F7CAC9", category: "premium" },
  { key: "chameleon_blue_purple", hex: "#6E4E9E", category: "premium", effect: "chameleon" },
  { key: "chameleon_black", hex: "#1A1A2E", category: "premium", effect: "chameleon" },
  { key: "chrome_gray", hex: "#A8A9AD", category: "premium", effect: "chrome" },
  { key: "chameleon_multicolor", hex: "#7F7F7F", category: "premium", effect: "chameleon" },
];
```

- [ ] **Step 5: Run the test; confirm PASS**

```bash
pnpm --filter @ramcar/features test -- color-catalog
```

Expected: PASS for all 7 describe blocks.

- [ ] **Step 6: Commit**

```bash
git add packages/features/package.json packages/features/src/shared/color-select/color-catalog.ts packages/features/src/shared/color-select/__tests__/color-catalog.test.ts
git commit -m "feat(color-select): add 100-entry color catalog"
```

---

## Task 3: Build lookup and search helpers (TDD)

**Files:**
- Create: `packages/features/src/shared/color-select/color-lookup.ts`
- Create: `packages/features/src/shared/color-select/__tests__/color-lookup.test.ts`

- [ ] **Step 1: Write the failing lookup tests**

Create `packages/features/src/shared/color-select/__tests__/color-lookup.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  normalizeHex,
  isHex,
  lookupByHex,
  normalizeSearch,
  buildSearchToken,
} from "../color-lookup";

describe("normalizeHex", () => {
  it("uppercases a 6-char hex", () => {
    expect(normalizeHex("#c8102e")).toBe("#C8102E");
  });

  it("expands a 3-char hex to 6-char", () => {
    expect(normalizeHex("#fff")).toBe("#FFFFFF");
    expect(normalizeHex("#0a3")).toBe("#00AA33");
  });

  it("leaves a valid uppercase hex unchanged", () => {
    expect(normalizeHex("#C8102E")).toBe("#C8102E");
  });

  it("returns null for non-hex input", () => {
    expect(normalizeHex("")).toBeNull();
    expect(normalizeHex("blanco")).toBeNull();
    expect(normalizeHex("red")).toBeNull();
    expect(normalizeHex("#GGGGGG")).toBeNull();
    expect(normalizeHex("#12345")).toBeNull();
    expect(normalizeHex(null as unknown as string)).toBeNull();
  });
});

describe("isHex", () => {
  it("recognizes canonical and lenient hex", () => {
    expect(isHex("#C8102E")).toBe(true);
    expect(isHex("#c8102e")).toBe(true);
    expect(isHex("#fff")).toBe(true);
  });

  it("rejects free text", () => {
    expect(isHex("blanco metalizado")).toBe(false);
    expect(isHex("")).toBe(false);
  });
});

describe("lookupByHex", () => {
  it("finds the catalog entry for a canonical HEX", () => {
    const entry = lookupByHex("#C8102E");
    expect(entry?.key).toBe("solid_red");
    expect(entry?.category).toBe("reds");
  });

  it("is case-insensitive on input", () => {
    expect(lookupByHex("#c8102e")?.key).toBe("solid_red");
  });

  it("returns null for custom HEX not in the catalog", () => {
    expect(lookupByHex("#7A4B2C")).toBeNull();
  });

  it("returns null for free text", () => {
    expect(lookupByHex("blanco")).toBeNull();
    expect(lookupByHex("")).toBeNull();
  });
});

describe("normalizeSearch", () => {
  it("lowercases and strips combining diacritics", () => {
    expect(normalizeSearch("Café")).toBe("cafe");
    expect(normalizeSearch("Rojo Oscuro")).toBe("rojo oscuro");
    expect(normalizeSearch("ÁÉÍÓÚñ")).toBe("aeioun");
  });

  it("passes through plain ASCII", () => {
    expect(normalizeSearch("red")).toBe("red");
  });
});

describe("buildSearchToken", () => {
  it("concatenates normalized EN label, ES label, and lowercase HEX", () => {
    const token = buildSearchToken({
      key: "solid_red",
      hex: "#C8102E",
      en: "Solid red",
      es: "Rojo sólido",
    });
    // All three tokens present, normalized
    expect(token).toContain("solid red");
    expect(token).toContain("rojo solido");
    expect(token).toContain("#c8102e");
  });
});
```

- [ ] **Step 2: Run the test; confirm it fails**

```bash
pnpm --filter @ramcar/features test -- color-lookup
```

Expected: FAIL — `Cannot find module '../color-lookup'`.

- [ ] **Step 3: Implement the helpers**

Create `packages/features/src/shared/color-select/color-lookup.ts`:

```ts
import { COLOR_CATALOG, type ColorEntry } from "./color-catalog";

const HEX_STRICT = /^#[0-9A-F]{6}$/;
const HEX_LENIENT_6 = /^#[0-9A-Fa-f]{6}$/;
const HEX_LENIENT_3 = /^#[0-9A-Fa-f]{3}$/;

const CATALOG_BY_HEX: ReadonlyMap<string, ColorEntry> = new Map(
  COLOR_CATALOG.map((entry) => [entry.hex, entry]),
);

/**
 * Canonicalize a user-supplied HEX value:
 * - Accepts 3-char (`#abc`) or 6-char (`#abcdef`), with any casing.
 * - Returns uppercase `#RRGGBB`.
 * - Returns null for anything that isn't a valid HEX string.
 */
export function normalizeHex(value: string): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  if (HEX_LENIENT_6.test(value)) return value.toUpperCase();
  if (HEX_LENIENT_3.test(value)) {
    const r = value[1]!;
    const g = value[2]!;
    const b = value[3]!;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return null;
}

export function isHex(value: string): boolean {
  return normalizeHex(value) !== null;
}

export function lookupByHex(value: string): ColorEntry | null {
  const hex = normalizeHex(value);
  if (!hex) return null;
  return CATALOG_BY_HEX.get(hex) ?? null;
}

/**
 * Lowercases and strips combining diacritical marks (Unicode U+0300–U+036F)
 * so `"Café"` → `"cafe"` and search is accent-insensitive.
 */
export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Builds the search token consumed by `cmdk`'s built-in filter.
 * Concatenates normalized EN label + normalized ES label + lowercase HEX,
 * so typing "rojo", "red", or "#c8102e" all match the same entry.
 */
export function buildSearchToken(input: {
  key: string;
  hex: string;
  en: string;
  es: string;
}): string {
  return [
    input.key,
    normalizeSearch(input.en),
    normalizeSearch(input.es),
    input.hex.toLowerCase(),
  ].join(" ");
}

// Internal constant exported for tests only.
export const HEX_PATTERN = HEX_STRICT;
```

- [ ] **Step 4: Run the test; confirm PASS**

```bash
pnpm --filter @ramcar/features test -- color-lookup
```

Expected: PASS for all 5 describe blocks.

- [ ] **Step 5: Commit**

```bash
git add packages/features/src/shared/color-select/color-lookup.ts packages/features/src/shared/color-select/__tests__/color-lookup.test.ts
git commit -m "feat(color-select): add hex normalization and search helpers"
```

---

## Task 4: Add i18n keys to `@ramcar/i18n`

**Files:**
- Modify: `packages/i18n/src/messages/en.json`
- Modify: `packages/i18n/src/messages/es.json`

No new test — the i18n messages are flat JSON; validating coverage is done via the component tests in later tasks (which mock i18n anyway) plus a manual `jq` sanity check.

- [ ] **Step 1: Replace the `vehicles.color` block in `en.json`**

In `packages/i18n/src/messages/en.json`, locate the block (currently around line 259):

```json
    "color": {
      "label": "Color",
      "placeholder": "e.g., White"
    },
```

Replace it with:

```json
    "color": {
      "label": "Color",
      "placeholder": "Select a color",
      "searchPlaceholder": "Search colors...",
      "addCustom": "+ Add custom color",
      "current": "Current",
      "noResults": "No colors match '{query}'",
      "legacyHint": "Stored as free text — select a color to update",
      "ariaLabel": "Color picker",
      "categories": {
        "neutrals": "Neutrals",
        "blues": "Blues",
        "reds": "Reds",
        "greens": "Greens",
        "yellowsOranges": "Yellows & oranges",
        "earth": "Browns, beige & earth",
        "premium": "Others / premium"
      },
      "options": {
        "white": "White",
        "pearl_white": "Pearl white",
        "ivory_white": "Ivory white",
        "black": "Black",
        "gloss_black": "Gloss black",
        "matte_black": "Matte black",
        "obsidian_black": "Obsidian black",
        "silver_gray": "Silver gray",
        "dark_gray": "Dark gray",
        "graphite_gray": "Graphite gray",
        "steel_gray": "Steel gray",
        "cement_gray": "Cement gray",
        "matte_gray": "Matte gray",
        "metallic_silver": "Metallic silver",
        "aluminum_silver": "Aluminum silver",
        "titanium_silver": "Titanium silver",
        "satin_silver": "Satin silver",
        "light_gray": "Light gray",
        "blue_gray": "Blue gray",
        "charcoal_gray": "Charcoal gray",
        "navy_blue": "Navy blue",
        "royal_blue": "Royal blue",
        "electric_blue": "Electric blue",
        "sky_blue": "Sky blue",
        "deep_blue": "Deep blue",
        "metallic_blue": "Metallic blue",
        "pearl_dark_blue": "Pearl dark blue",
        "cobalt_blue": "Cobalt blue",
        "petrol_blue": "Petrol blue",
        "indigo_blue": "Indigo blue",
        "turquoise_blue": "Turquoise blue",
        "aqua_blue": "Aqua blue",
        "matte_blue": "Matte blue",
        "steel_blue": "Steel blue",
        "midnight_blue": "Midnight blue",
        "solid_red": "Solid red",
        "bright_red": "Bright red",
        "cherry_red": "Cherry red",
        "wine_red": "Wine red",
        "carmine_red": "Carmine red",
        "scarlet_red": "Scarlet red",
        "metallic_red": "Metallic red",
        "pearl_red": "Pearl red",
        "dark_red": "Dark red",
        "brick_red": "Brick red",
        "orange_red": "Orange red",
        "burgundy_red": "Burgundy red",
        "ruby_red": "Ruby red",
        "matte_red": "Matte red",
        "racing_red": "Racing red",
        "olive_green": "Olive green",
        "military_green": "Military green",
        "bottle_green": "Bottle green",
        "dark_green": "Dark green",
        "lime_green": "Lime green",
        "bright_green": "Bright green",
        "metallic_green": "Metallic green",
        "emerald_green": "Emerald green",
        "jade_green": "Jade green",
        "matte_green": "Matte green",
        "forest_green": "Forest green",
        "mint_green": "Mint green",
        "acid_green": "Acid green",
        "solid_yellow": "Solid yellow",
        "bright_yellow": "Bright yellow",
        "canary_yellow": "Canary yellow",
        "mustard_yellow": "Mustard yellow",
        "metallic_yellow": "Metallic yellow",
        "matte_yellow": "Matte yellow",
        "gold_yellow": "Gold yellow",
        "bright_orange": "Bright orange",
        "burnt_orange": "Burnt orange",
        "metallic_orange": "Metallic orange",
        "matte_orange": "Matte orange",
        "copper_orange": "Copper orange",
        "flame_orange": "Flame orange",
        "dark_brown": "Dark brown",
        "light_brown": "Light brown",
        "chocolate_brown": "Chocolate brown",
        "metallic_brown": "Metallic brown",
        "beige": "Beige",
        "sand": "Sand",
        "champagne": "Champagne",
        "bronze": "Bronze",
        "metallic_bronze": "Metallic bronze",
        "gold": "Gold",
        "satin_gold": "Satin gold",
        "copper": "Copper",
        "purple": "Purple",
        "dark_purple": "Dark purple",
        "metallic_purple": "Metallic purple",
        "violet": "Violet",
        "magenta": "Magenta",
        "pink": "Pink",
        "metallic_pink": "Metallic pink",
        "quartz_pink": "Quartz pink",
        "chameleon_blue_purple": "Chameleon blue/purple",
        "chameleon_black": "Chameleon black",
        "chrome_gray": "Chrome gray",
        "chameleon_multicolor": "Chameleon multicolor"
      }
    },
```

- [ ] **Step 2: Replace the `vehicles.color` block in `es.json`**

In `packages/i18n/src/messages/es.json`, locate the block (currently around line 259):

```json
    "color": {
      "label": "Color",
      "placeholder": "Ej: Blanco"
    },
```

Replace it with:

```json
    "color": {
      "label": "Color",
      "placeholder": "Selecciona un color",
      "searchPlaceholder": "Buscar colores...",
      "addCustom": "+ Agregar color personalizado",
      "current": "Actual",
      "noResults": "Ningún color coincide con '{query}'",
      "legacyHint": "Guardado como texto libre — selecciona un color para actualizar",
      "ariaLabel": "Selector de color",
      "categories": {
        "neutrals": "Neutros",
        "blues": "Azules",
        "reds": "Rojos",
        "greens": "Verdes",
        "yellowsOranges": "Amarillos y naranjas",
        "earth": "Cafés, beige y tierra",
        "premium": "Otros / premium"
      },
      "options": {
        "white": "Blanco",
        "pearl_white": "Blanco perlado",
        "ivory_white": "Blanco marfil",
        "black": "Negro",
        "gloss_black": "Negro brillante",
        "matte_black": "Negro mate",
        "obsidian_black": "Negro obsidiana",
        "silver_gray": "Gris plata",
        "dark_gray": "Gris oscuro",
        "graphite_gray": "Gris grafito",
        "steel_gray": "Gris acero",
        "cement_gray": "Gris cemento",
        "matte_gray": "Gris mate",
        "metallic_silver": "Plata metálico",
        "aluminum_silver": "Plata aluminio",
        "titanium_silver": "Plata titanio",
        "satin_silver": "Plata satinado",
        "light_gray": "Gris claro",
        "blue_gray": "Gris azulado",
        "charcoal_gray": "Gris carbón",
        "navy_blue": "Azul marino",
        "royal_blue": "Azul rey",
        "electric_blue": "Azul eléctrico",
        "sky_blue": "Azul cielo",
        "deep_blue": "Azul profundo",
        "metallic_blue": "Azul metálico",
        "pearl_dark_blue": "Azul oscuro perlado",
        "cobalt_blue": "Azul cobalto",
        "petrol_blue": "Azul petróleo",
        "indigo_blue": "Azul índigo",
        "turquoise_blue": "Azul turquesa",
        "aqua_blue": "Azul aqua",
        "matte_blue": "Azul mate",
        "steel_blue": "Azul acero",
        "midnight_blue": "Azul medianoche",
        "solid_red": "Rojo sólido",
        "bright_red": "Rojo brillante",
        "cherry_red": "Rojo cereza",
        "wine_red": "Rojo vino",
        "carmine_red": "Rojo carmín",
        "scarlet_red": "Rojo escarlata",
        "metallic_red": "Rojo metálico",
        "pearl_red": "Rojo perlado",
        "dark_red": "Rojo oscuro",
        "brick_red": "Rojo ladrillo",
        "orange_red": "Rojo anaranjado",
        "burgundy_red": "Rojo burdeos",
        "ruby_red": "Rojo rubí",
        "matte_red": "Rojo mate",
        "racing_red": "Rojo racing",
        "olive_green": "Verde oliva",
        "military_green": "Verde militar",
        "bottle_green": "Verde botella",
        "dark_green": "Verde oscuro",
        "lime_green": "Verde lima",
        "bright_green": "Verde brillante",
        "metallic_green": "Verde metálico",
        "emerald_green": "Verde esmeralda",
        "jade_green": "Verde jade",
        "matte_green": "Verde mate",
        "forest_green": "Verde bosque",
        "mint_green": "Verde menta",
        "acid_green": "Verde ácido",
        "solid_yellow": "Amarillo sólido",
        "bright_yellow": "Amarillo brillante",
        "canary_yellow": "Amarillo canario",
        "mustard_yellow": "Amarillo mostaza",
        "metallic_yellow": "Amarillo metálico",
        "matte_yellow": "Amarillo mate",
        "gold_yellow": "Amarillo dorado",
        "bright_orange": "Naranja brillante",
        "burnt_orange": "Naranja quemado",
        "metallic_orange": "Naranja metálico",
        "matte_orange": "Naranja mate",
        "copper_orange": "Naranja cobrizo",
        "flame_orange": "Naranja flama",
        "dark_brown": "Café oscuro",
        "light_brown": "Café claro",
        "chocolate_brown": "Café chocolate",
        "metallic_brown": "Café metálico",
        "beige": "Beige",
        "sand": "Arena",
        "champagne": "Champagne",
        "bronze": "Bronce",
        "metallic_bronze": "Bronce metálico",
        "gold": "Oro",
        "satin_gold": "Oro satinado",
        "copper": "Cobre",
        "purple": "Morado",
        "dark_purple": "Morado oscuro",
        "metallic_purple": "Morado metálico",
        "violet": "Violeta",
        "magenta": "Magenta",
        "pink": "Rosa",
        "metallic_pink": "Rosa metálico",
        "quartz_pink": "Rosa cuarzo",
        "chameleon_blue_purple": "Azul/morado camaleón",
        "chameleon_black": "Negro con efecto camaleón",
        "chrome_gray": "Gris con efecto cromado",
        "chameleon_multicolor": "Camaleón multicolor"
      }
    },
```

- [ ] **Step 3: Validate both JSON files parse and key-sets match**

```bash
node -e "const en=require('./packages/i18n/src/messages/en.json').vehicles.color.options; const es=require('./packages/i18n/src/messages/es.json').vehicles.color.options; const a=Object.keys(en).sort(); const b=Object.keys(es).sort(); if(a.length!==100) throw new Error('EN options must have 100 entries, got '+a.length); if(b.length!==100) throw new Error('ES options must have 100 entries, got '+b.length); if(JSON.stringify(a)!==JSON.stringify(b)) throw new Error('EN and ES option keys differ'); console.log('OK — 100 options, key-sets match');"
```

Expected: `OK — 100 options, key-sets match`.

- [ ] **Step 4: Commit**

```bash
git add packages/i18n/src/messages/en.json packages/i18n/src/messages/es.json
git commit -m "feat(i18n): add vehicle color catalog translations (100 entries)"
```

---

## Task 5: Build `ColorSelect` — trigger rendering states (TDD)

**Files:**
- Create: `packages/features/src/shared/color-select/color-select.tsx` (first slice)
- Create: `packages/features/src/shared/color-select/__tests__/color-select.test.tsx`
- Create: `packages/features/src/shared/color-select/index.ts`

- [ ] **Step 1: Write the failing trigger tests**

Create `packages/features/src/shared/color-select/__tests__/color-select.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { renderWithHarness } from "../../../test/harness";
import { ColorSelect } from "../color-select";

afterEach(() => cleanup());

describe("ColorSelect — trigger rendering", () => {
  it("shows the placeholder key when value is null", () => {
    renderWithHarness(<ColorSelect value={null} onChange={() => {}} />);
    // The mock I18nPort returns the key itself.
    expect(screen.getByRole("button")).toHaveTextContent("vehicles.color.placeholder");
  });

  it("shows the catalog option key when value matches a curated HEX", () => {
    renderWithHarness(<ColorSelect value="#C8102E" onChange={() => {}} />);
    expect(screen.getByRole("button")).toHaveTextContent("vehicles.color.options.solid_red");
  });

  it("is case-insensitive on the value (lower-case hex resolves to catalog entry)", () => {
    renderWithHarness(<ColorSelect value="#c8102e" onChange={() => {}} />);
    expect(screen.getByRole("button")).toHaveTextContent("vehicles.color.options.solid_red");
  });

  it("renders a catalog swatch whose background matches the HEX", () => {
    renderWithHarness(<ColorSelect value="#C8102E" onChange={() => {}} />);
    const swatch = screen.getByTestId("color-select-swatch");
    expect(swatch).toHaveAttribute("data-variant", "flat");
    expect(swatch.style.backgroundColor).toBeTruthy();
  });

  it("shows the raw HEX as label when value is a custom HEX not in catalog", () => {
    renderWithHarness(<ColorSelect value="#7A4B2C" onChange={() => {}} />);
    expect(screen.getByRole("button")).toHaveTextContent("#7A4B2C");
    expect(screen.getByTestId("color-select-swatch")).toHaveAttribute("data-variant", "flat");
  });

  it("shows the raw string with legacy indicator when value is free text", () => {
    renderWithHarness(<ColorSelect value="blanco metalizado" onChange={() => {}} />);
    expect(screen.getByRole("button")).toHaveTextContent("blanco metalizado");
    expect(screen.getByTestId("color-select-swatch")).toHaveAttribute("data-variant", "legacy");
  });

  it("renders the chameleon swatch variant for an effect entry", () => {
    renderWithHarness(<ColorSelect value="#6E4E9E" onChange={() => {}} />);
    expect(screen.getByTestId("color-select-swatch")).toHaveAttribute("data-variant", "chameleon");
  });

  it("renders the chrome swatch variant for the chrome entry", () => {
    renderWithHarness(<ColorSelect value="#A8A9AD" onChange={() => {}} />);
    expect(screen.getByTestId("color-select-swatch")).toHaveAttribute("data-variant", "chrome");
  });

  it("applies the aria-label from the prop when provided", () => {
    renderWithHarness(
      <ColorSelect value={null} onChange={() => {}} ariaLabel="Vehicle color" />,
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Vehicle color");
  });

  it("respects the disabled prop", () => {
    renderWithHarness(<ColorSelect value={null} onChange={() => {}} disabled />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  // Hooks to keep onChange unused warnings silent in these cases:
  it("does not call onChange during render", () => {
    const onChange = vi.fn();
    renderWithHarness(<ColorSelect value={null} onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test; confirm it fails because the module does not exist**

```bash
pnpm --filter @ramcar/features test -- color-select
```

Expected: FAIL — `Cannot find module '../color-select'`.

- [ ] **Step 3: Create the barrel `index.ts`**

Create `packages/features/src/shared/color-select/index.ts`:

```ts
export { ColorSelect } from "./color-select";
export type { ColorSelectProps } from "./color-select";
export {
  COLOR_CATALOG,
  COLOR_CATEGORIES,
  type ColorCategory,
  type ColorEffect,
  type ColorEntry,
} from "./color-catalog";
export {
  normalizeHex,
  isHex,
  lookupByHex,
  normalizeSearch,
  buildSearchToken,
} from "./color-lookup";
```

- [ ] **Step 4: Implement the trigger slice of `color-select.tsx`**

Create `packages/features/src/shared/color-select/color-select.tsx`:

```tsx
import { useMemo } from "react";
import { Button } from "@ramcar/ui";
import { ChevronDown } from "lucide-react";
import { useI18n } from "../../adapters";
import { COLOR_CATALOG, type ColorEntry } from "./color-catalog";
import { lookupByHex, normalizeHex, isHex } from "./color-lookup";

export interface ColorSelectProps {
  value: string | null;
  onChange: (hex: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
}

type SwatchVariant = "none" | "flat" | "legacy" | "chameleon" | "chrome";

interface TriggerDisplay {
  variant: SwatchVariant;
  color: string | null; // HEX for flat, null otherwise
  label: string;
  isPlaceholder: boolean;
}

function computeTriggerDisplay(
  value: string | null,
  placeholder: string,
  t: (key: string) => string,
): TriggerDisplay {
  if (value == null || value === "") {
    return { variant: "none", color: null, label: placeholder, isPlaceholder: true };
  }

  const canonicalHex = normalizeHex(value);
  if (canonicalHex) {
    const entry = lookupByHex(canonicalHex);
    if (entry) {
      const variant: SwatchVariant =
        entry.effect === "chameleon"
          ? "chameleon"
          : entry.effect === "chrome"
            ? "chrome"
            : "flat";
      return {
        variant,
        color: entry.hex,
        label: t(`vehicles.color.options.${entry.key}`),
        isPlaceholder: false,
      };
    }
    // Custom HEX — flat swatch, raw HEX as label
    return { variant: "flat", color: canonicalHex, label: canonicalHex, isPlaceholder: false };
  }

  // Legacy free text — neutral dashed-ring indicator, raw string as label
  return { variant: "legacy", color: null, label: value, isPlaceholder: false };
}

function Swatch({
  variant,
  color,
}: {
  variant: SwatchVariant;
  color: string | null;
}) {
  if (variant === "none") return null;

  const base = "h-4 w-4 rounded-full border border-border shrink-0";

  if (variant === "legacy") {
    return (
      <span
        data-testid="color-select-swatch"
        data-variant="legacy"
        aria-hidden="true"
        className={`${base} border-dashed bg-transparent`}
      />
    );
  }

  if (variant === "chameleon") {
    return (
      <span
        data-testid="color-select-swatch"
        data-variant="chameleon"
        aria-hidden="true"
        className={base}
        style={{
          background:
            "conic-gradient(from 0deg, #6E4E9E, #00A86B, #E75480, #30D5C8, #6E4E9E)",
        }}
      />
    );
  }

  if (variant === "chrome") {
    return (
      <span
        data-testid="color-select-swatch"
        data-variant="chrome"
        aria-hidden="true"
        className={base}
        style={{
          background:
            "linear-gradient(135deg, #D8D9DC 0%, #7D7E82 50%, #D8D9DC 100%)",
        }}
      />
    );
  }

  return (
    <span
      data-testid="color-select-swatch"
      data-variant="flat"
      aria-hidden="true"
      className={base}
      style={{ backgroundColor: color ?? undefined }}
    />
  );
}

export function ColorSelect({
  value,
  onChange: _onChange,
  placeholder,
  disabled,
  id,
  ariaLabel,
}: ColorSelectProps) {
  const { t } = useI18n();

  const effectivePlaceholder = placeholder ?? t("vehicles.color.placeholder");
  const display = useMemo(
    () => computeTriggerDisplay(value, effectivePlaceholder, t),
    [value, effectivePlaceholder, t],
  );

  return (
    <Button
      type="button"
      variant="outline"
      id={id}
      disabled={disabled}
      aria-label={ariaLabel ?? t("vehicles.color.ariaLabel")}
      className="w-full justify-start gap-2 font-normal"
    >
      <Swatch variant={display.variant} color={display.color} />
      <span
        className={display.isPlaceholder ? "text-muted-foreground truncate" : "truncate"}
      >
        {display.label}
      </span>
      <ChevronDown className="ml-auto h-4 w-4 opacity-50" aria-hidden="true" />
    </Button>
  );
}

// Internal helpers exported for the next tasks; not part of the public API.
export { computeTriggerDisplay, COLOR_CATALOG, type ColorEntry, isHex };
```

Note: this slice intentionally does NOT yet open a popover — the `onChange` prop is temporarily unused (aliased with `_onChange`). The interaction layer arrives in Task 6.

- [ ] **Step 5: Run the test; confirm PASS**

```bash
pnpm --filter @ramcar/features test -- color-select
```

Expected: PASS (11 tests in the "trigger rendering" describe block).

- [ ] **Step 6: Commit**

```bash
git add packages/features/src/shared/color-select/color-select.tsx packages/features/src/shared/color-select/index.ts packages/features/src/shared/color-select/__tests__/color-select.test.tsx
git commit -m "feat(color-select): add trigger with swatch variants"
```

---

## Task 6: Open-state popover — search, groups, keyboard, selection (TDD)

**Files:**
- Modify: `packages/features/src/shared/color-select/color-select.tsx`
- Modify: `packages/features/src/shared/color-select/__tests__/color-select.test.tsx`

- [ ] **Step 1: Extend the test file with open-state and interaction tests**

Append the following block at the bottom of `packages/features/src/shared/color-select/__tests__/color-select.test.tsx`, BEFORE the final closing brace of the outer `describe` is consumed. (The previous `describe` block in Task 5 was `"ColorSelect — trigger rendering"`. Add a new top-level `describe` after it.)

```tsx
import { userEvent } from "@testing-library/user-event";

describe("ColorSelect — open state + keyboard", () => {
  it("opens the popover when the trigger is clicked", async () => {
    const user = userEvent.setup();
    renderWithHarness(<ColorSelect value={null} onChange={() => {}} />);

    await user.click(screen.getByRole("button"));

    // The search input is visible when the popover is open.
    expect(
      screen.getByPlaceholderText("vehicles.color.searchPlaceholder"),
    ).toBeInTheDocument();
  });

  it("renders all 7 category group headers when opened", async () => {
    const user = userEvent.setup();
    renderWithHarness(<ColorSelect value={null} onChange={() => {}} />);
    await user.click(screen.getByRole("button"));

    for (const cat of [
      "vehicles.color.categories.neutrals",
      "vehicles.color.categories.blues",
      "vehicles.color.categories.reds",
      "vehicles.color.categories.greens",
      "vehicles.color.categories.yellowsOranges",
      "vehicles.color.categories.earth",
      "vehicles.color.categories.premium",
    ]) {
      expect(screen.getByText(cat)).toBeInTheDocument();
    }
  });

  it("filters the list by localized label (EN)", async () => {
    const user = userEvent.setup();
    renderWithHarness(<ColorSelect value={null} onChange={() => {}} />);
    await user.click(screen.getByRole("button"));

    await user.type(
      screen.getByPlaceholderText("vehicles.color.searchPlaceholder"),
      "solid red",
    );

    expect(
      screen.getByText("vehicles.color.options.solid_red"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("vehicles.color.options.sky_blue"),
    ).not.toBeInTheDocument();
  });

  it("filters case- and accent-insensitively (ES token)", async () => {
    const user = userEvent.setup();
    renderWithHarness(<ColorSelect value={null} onChange={() => {}} />);
    await user.click(screen.getByRole("button"));

    // "cafe" (no accent, lowercase) should still find "Café oscuro" etc.
    await user.type(
      screen.getByPlaceholderText("vehicles.color.searchPlaceholder"),
      "cafe",
    );

    expect(
      screen.getByText("vehicles.color.options.dark_brown"),
    ).toBeInTheDocument();
  });

  it("filters by HEX substring", async () => {
    const user = userEvent.setup();
    renderWithHarness(<ColorSelect value={null} onChange={() => {}} />);
    await user.click(screen.getByRole("button"));

    await user.type(
      screen.getByPlaceholderText("vehicles.color.searchPlaceholder"),
      "#c8102e",
    );

    expect(
      screen.getByText("vehicles.color.options.solid_red"),
    ).toBeInTheDocument();
  });

  it("emits the HEX and closes when an item is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithHarness(<ColorSelect value={null} onChange={onChange} />);

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("vehicles.color.options.solid_red"));

    expect(onChange).toHaveBeenCalledWith("#C8102E");
    // Popover is closed — search input is gone.
    expect(
      screen.queryByPlaceholderText("vehicles.color.searchPlaceholder"),
    ).not.toBeInTheDocument();
  });

  it("emits the HEX when ArrowDown+Enter is used", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithHarness(<ColorSelect value={null} onChange={onChange} />);

    await user.click(screen.getByRole("button"));
    // First item after the "Add custom color" row should be the first catalog entry (#FFFFFF — white).
    // ArrowDown once to highlight "Add custom", again to highlight white, then Enter.
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]![0]).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("shows the empty-state message when no catalog entry matches", async () => {
    const user = userEvent.setup();
    renderWithHarness(<ColorSelect value={null} onChange={() => {}} />);
    await user.click(screen.getByRole("button"));

    await user.type(
      screen.getByPlaceholderText("vehicles.color.searchPlaceholder"),
      "zzzzzzzz",
    );

    // The i18n mock returns the key as-is; cmdk will render the CommandEmpty child.
    expect(screen.getByText("vehicles.color.noResults")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test; confirm FAIL**

```bash
pnpm --filter @ramcar/features test -- color-select
```

Expected: FAIL — the new tests fail because there is no popover content yet.

- [ ] **Step 3: Extend `color-select.tsx` with the popover, grouped catalog, search, and keyboard**

Replace the entire contents of `packages/features/src/shared/color-select/color-select.tsx` with:

```tsx
import { useMemo, useState } from "react";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@ramcar/ui";
import { ChevronDown } from "lucide-react";
import { useI18n } from "../../adapters";
import {
  COLOR_CATALOG,
  COLOR_CATEGORIES,
  type ColorCategory,
  type ColorEntry,
} from "./color-catalog";
import {
  lookupByHex,
  normalizeHex,
  buildSearchToken,
  normalizeSearch,
} from "./color-lookup";

export interface ColorSelectProps {
  value: string | null;
  onChange: (hex: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
}

type SwatchVariant = "none" | "flat" | "legacy" | "chameleon" | "chrome";

interface TriggerDisplay {
  variant: SwatchVariant;
  color: string | null;
  label: string;
  isPlaceholder: boolean;
}

function swatchVariantForEntry(entry: ColorEntry): SwatchVariant {
  if (entry.effect === "chameleon") return "chameleon";
  if (entry.effect === "chrome") return "chrome";
  return "flat";
}

function computeTriggerDisplay(
  value: string | null,
  placeholder: string,
  t: (key: string) => string,
): TriggerDisplay {
  if (value == null || value === "") {
    return { variant: "none", color: null, label: placeholder, isPlaceholder: true };
  }

  const canonicalHex = normalizeHex(value);
  if (canonicalHex) {
    const entry = lookupByHex(canonicalHex);
    if (entry) {
      return {
        variant: swatchVariantForEntry(entry),
        color: entry.hex,
        label: t(`vehicles.color.options.${entry.key}`),
        isPlaceholder: false,
      };
    }
    return { variant: "flat", color: canonicalHex, label: canonicalHex, isPlaceholder: false };
  }

  return { variant: "legacy", color: null, label: value, isPlaceholder: false };
}

function Swatch({ variant, color }: { variant: SwatchVariant; color: string | null }) {
  if (variant === "none") return null;
  const base = "h-4 w-4 rounded-full border border-border shrink-0";

  if (variant === "legacy") {
    return (
      <span
        data-testid="color-select-swatch"
        data-variant="legacy"
        aria-hidden="true"
        className={`${base} border-dashed bg-transparent`}
      />
    );
  }

  if (variant === "chameleon") {
    return (
      <span
        data-testid="color-select-swatch"
        data-variant="chameleon"
        aria-hidden="true"
        className={base}
        style={{
          background:
            "conic-gradient(from 0deg, #6E4E9E, #00A86B, #E75480, #30D5C8, #6E4E9E)",
        }}
      />
    );
  }

  if (variant === "chrome") {
    return (
      <span
        data-testid="color-select-swatch"
        data-variant="chrome"
        aria-hidden="true"
        className={base}
        style={{
          background:
            "linear-gradient(135deg, #D8D9DC 0%, #7D7E82 50%, #D8D9DC 100%)",
        }}
      />
    );
  }

  return (
    <span
      data-testid="color-select-swatch"
      data-variant="flat"
      aria-hidden="true"
      className={base}
      style={{ backgroundColor: color ?? undefined }}
    />
  );
}

/**
 * Pre-compute one row per catalog entry with:
 *  - `searchValue`: the string cmdk uses for filtering (buildSearchToken).
 *  - `label`: the localized display text (updates per re-render via `t`).
 *  - `variant`: flat / chameleon / chrome.
 */
function useCatalogRows(t: (key: string) => string) {
  return useMemo(() => {
    const byCategory = new Map<ColorCategory, Array<{
      entry: ColorEntry;
      searchValue: string;
      label: string;
      variant: SwatchVariant;
    }>>();
    for (const cat of COLOR_CATEGORIES) byCategory.set(cat, []);

    for (const entry of COLOR_CATALOG) {
      const label = t(`vehicles.color.options.${entry.key}`);
      const enKey = `vehicles.color.options.${entry.key}`;
      // When the host app provides a real i18n adapter, `label` is the localized string;
      // in tests the mock returns the key, so both cases flow through buildSearchToken uniformly.
      const searchValue = buildSearchToken({
        key: entry.key,
        hex: entry.hex,
        en: label,
        es: label, // EN/ES collapse when i18n resolves to one locale; when mock returns key we still get searchable tokens.
      }) + " " + enKey; // include the namespaced key so EN locale can also match "solid_red"-style queries
      byCategory.get(entry.category)!.push({
        entry,
        searchValue,
        label,
        variant: swatchVariantForEntry(entry),
      });
    }
    return byCategory;
  }, [t]);
}

export function ColorSelect({
  value,
  onChange,
  placeholder,
  disabled,
  id,
  ariaLabel,
}: ColorSelectProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const effectivePlaceholder = placeholder ?? t("vehicles.color.placeholder");
  const display = useMemo(
    () => computeTriggerDisplay(value, effectivePlaceholder, t),
    [value, effectivePlaceholder, t],
  );
  const rowsByCategory = useCatalogRows(t);

  function handleSelectCatalog(entry: ColorEntry) {
    onChange(entry.hex);
    setOpen(false);
    setSearch("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel ?? t("vehicles.color.ariaLabel")}
          aria-expanded={open}
          role="button"
          className="w-full justify-start gap-2 font-normal"
        >
          <Swatch variant={display.variant} color={display.color} />
          <span
            className={
              display.isPlaceholder ? "text-muted-foreground truncate" : "truncate"
            }
          >
            {display.label}
          </span>
          <ChevronDown className="ml-auto h-4 w-4 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0"
      >
        <Command
          filter={(itemValue, searchTerm) => {
            // cmdk lowercases `itemValue` automatically; normalize the searchTerm
            // for accent/diacritic handling (so "cafe" matches "Café ...").
            const needle = normalizeSearch(searchTerm);
            return itemValue.includes(needle) ? 1 : 0;
          }}
        >
          <CommandInput
            placeholder={t("vehicles.color.searchPlaceholder")}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {t("vehicles.color.noResults").replace("{query}", search)}
            </CommandEmpty>
            {COLOR_CATEGORIES.map((cat) => {
              const rows = rowsByCategory.get(cat) ?? [];
              if (rows.length === 0) return null;
              return (
                <CommandGroup key={cat} heading={t(`vehicles.color.categories.${cat}`)}>
                  {rows.map(({ entry, searchValue, label, variant }) => (
                    <CommandItem
                      key={entry.key}
                      value={searchValue}
                      onSelect={() => handleSelectCatalog(entry)}
                    >
                      <Swatch variant={variant} color={entry.hex} />
                      <span className="truncate">{label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { computeTriggerDisplay };
```

- [ ] **Step 4: Run the test; confirm PASS for both describe blocks**

```bash
pnpm --filter @ramcar/features test -- color-select
```

Expected: PASS for all tests in `"trigger rendering"` and `"open state + keyboard"`.

Notes for the implementer, if this step initially fails:

1. `cmdk` filters items by lowercased `value` — if a test fails because filtering misses a case, log `itemValue`/`needle` inside the custom `filter` callback and adjust `buildSearchToken` output. The search token MUST include the lowercased HEX with the `#` prefix.
2. Radix Popover in jsdom sometimes needs the `PopoverContent` to be explicitly opened via state (not just `onOpenChange`). The `open` state here is already controlled, so the popover opens on trigger click via `onOpenChange`. If tests can't find `CommandInput`, ensure `userEvent.setup()` is awaited and the click resolved.

- [ ] **Step 5: Commit**

```bash
git add packages/features/src/shared/color-select/color-select.tsx packages/features/src/shared/color-select/__tests__/color-select.test.tsx
git commit -m "feat(color-select): add popover with grouped catalog and keyboard nav"
```

---

## Task 7: "Add custom color" native picker (TDD)

**Files:**
- Modify: `packages/features/src/shared/color-select/color-select.tsx`
- Modify: `packages/features/src/shared/color-select/__tests__/color-select.test.tsx`

- [ ] **Step 1: Extend the test file with native-picker tests**

Append this block at the bottom of `packages/features/src/shared/color-select/__tests__/color-select.test.tsx`:

```tsx
describe("ColorSelect — Add custom color", () => {
  it("clicks the hidden <input type=color> when the Add-custom item is selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithHarness(<ColorSelect value={null} onChange={onChange} />);

    await user.click(screen.getByRole("button"));

    const hiddenInput = screen.getByTestId("color-select-native-input") as HTMLInputElement;
    const clickSpy = vi.spyOn(hiddenInput, "click");

    await user.click(screen.getByText("vehicles.color.addCustom"));

    expect(clickSpy).toHaveBeenCalledTimes(1);
    // onChange has NOT been called yet — the browser picker opens and user must pick.
    expect(onChange).not.toHaveBeenCalled();
  });

  it("emits the HEX (uppercased) when the native picker fires a change event", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithHarness(<ColorSelect value={null} onChange={onChange} />);

    await user.click(screen.getByRole("button"));
    const hiddenInput = screen.getByTestId("color-select-native-input") as HTMLInputElement;

    // Simulate the browser picker selecting a custom color.
    // user.type / fireEvent.change on a type=color input sets .value and fires change.
    hiddenInput.value = "#7a4b2c";
    hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));

    expect(onChange).toHaveBeenCalledWith("#7A4B2C");
    // Popover closed.
    expect(
      screen.queryByPlaceholderText("vehicles.color.searchPlaceholder"),
    ).not.toBeInTheDocument();
  });

  it("shows the 'Current' row when value is a custom HEX not in catalog", async () => {
    const user = userEvent.setup();
    renderWithHarness(<ColorSelect value="#7A4B2C" onChange={() => {}} />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByText("vehicles.color.current")).toBeInTheDocument();
  });

  it("does NOT show the 'Current' row when value is a catalog HEX", async () => {
    const user = userEvent.setup();
    renderWithHarness(<ColorSelect value="#C8102E" onChange={() => {}} />);

    await user.click(screen.getByRole("button"));

    expect(screen.queryByText("vehicles.color.current")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test; confirm FAIL**

```bash
pnpm --filter @ramcar/features test -- color-select
```

Expected: FAIL — `getByTestId('color-select-native-input')` not found, and the "Add custom" text is not rendered.

- [ ] **Step 3: Add the Add-custom row, the Current row, and the hidden native input**

In `packages/features/src/shared/color-select/color-select.tsx`, inside the `ColorSelect` function body:

1. Add a ref for the hidden input, near `useState`:

   ```tsx
   import { useMemo, useRef, useState } from "react";
   // ... inside ColorSelect:
   const nativeInputRef = useRef<HTMLInputElement>(null);
   ```

2. Determine whether `value` is a custom HEX (for the Current row):

   ```tsx
   const canonicalHex = value != null ? normalizeHex(value) : null;
   const isCustomHex = canonicalHex != null && lookupByHex(canonicalHex) == null;
   ```

3. Add a handler that opens the native picker and a handler that consumes the picker result:

   ```tsx
   function handleOpenNativePicker() {
     nativeInputRef.current?.click();
   }

   function handleNativeChange(e: React.ChangeEvent<HTMLInputElement>) {
     const canonical = normalizeHex(e.target.value);
     if (canonical) {
       onChange(canonical);
       setOpen(false);
       setSearch("");
     }
   }
   ```

4. Render the hidden input (once per component, outside the popover but inside the root fragment) — the simplest placement is right above the `<Popover>` at the top of the returned tree. Wrap the existing return in a fragment:

   ```tsx
   return (
     <>
       <input
         ref={nativeInputRef}
         data-testid="color-select-native-input"
         type="color"
         aria-hidden="true"
         tabIndex={-1}
         onChange={handleNativeChange}
         className="sr-only absolute h-0 w-0 overflow-hidden opacity-0"
       />
       <Popover open={open} onOpenChange={setOpen}>
         {/* existing trigger + content */}
       </Popover>
     </>
   );
   ```

5. Inside the `<CommandList>`, above the first `<CommandGroup>`, add the Add-custom row and (conditionally) the Current row. Use a distinct `forceMount`-like approach so these rows don't get filtered out when the user types — set each `value` to a high-priority sentinel and include it in the filter explicitly:

   ```tsx
   <CommandGroup>
     <CommandItem
       key="__add_custom__"
       value="__add_custom__ add custom agregar color personalizado"
       onSelect={handleOpenNativePicker}
     >
       <span aria-hidden="true" className="h-4 w-4 shrink-0" />
       <span className="truncate">{t("vehicles.color.addCustom")}</span>
     </CommandItem>
     {isCustomHex && canonicalHex ? (
       <CommandItem
         key="__current__"
         value={`__current__ ${canonicalHex.toLowerCase()}`}
         onSelect={() => {
           // Keep it. No change — just close.
           setOpen(false);
           setSearch("");
         }}
       >
         <Swatch variant="flat" color={canonicalHex} />
         <span className="truncate">
           {t("vehicles.color.current")} — {canonicalHex}
         </span>
       </CommandItem>
     ) : null}
   </CommandGroup>
   ```

   Note: The sentinel `__add_custom__` token is included in the item's `value` so that the `filter` function (which returns 1 when `itemValue.includes(needle)`) will keep the Add-custom row visible when search is empty. When the user types "solid red", the sentinel no longer matches, so Add-custom drops out of view along with the non-matching catalog rows — and that's fine, since the empty state still guides the user.

   Alternative: use `forceMount` on the Add-custom CommandItem so it is always visible. If the implementation prefers that, replace the sentinel-value trick with `<CommandItem forceMount …>` (cmdk v1+ supports this).

- [ ] **Step 4: Run the test; confirm PASS**

```bash
pnpm --filter @ramcar/features test -- color-select
```

Expected: PASS for the `"Add custom color"` describe block (and the previous two blocks still pass).

- [ ] **Step 5: Commit**

```bash
git add packages/features/src/shared/color-select/color-select.tsx packages/features/src/shared/color-select/__tests__/color-select.test.tsx
git commit -m "feat(color-select): add native color picker and current-value row"
```

---

## Task 8: Re-export from the package and run the full feature test suite

**Files:**
- Modify: `packages/features/src/shared/index.ts`

- [ ] **Step 1: Add the re-export**

In `packages/features/src/shared/index.ts`, after the `ResidentSelect` export line (currently line 10):

```ts
export { ResidentSelect } from "./resident-select";

export { ColorSelect } from "./color-select";
export type { ColorSelectProps } from "./color-select";
export {
  COLOR_CATALOG,
  COLOR_CATEGORIES,
  type ColorCategory,
  type ColorEffect,
  type ColorEntry,
  lookupByHex,
  normalizeHex,
  isHex,
} from "./color-select";

export { useKeyboardNavigation } from "./hooks/use-keyboard-navigation";
```

- [ ] **Step 2: Run the entire features test suite**

```bash
pnpm --filter @ramcar/features test
```

Expected: all existing tests still pass, plus the 3 new color-select test files.

- [ ] **Step 3: Typecheck the package**

```bash
pnpm --filter @ramcar/features typecheck
```

Expected: exit 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/features/src/shared/index.ts
git commit -m "feat(color-select): export ColorSelect from features package"
```

---

## Task 9: Swap the vehicle form's color input

**Files:**
- Modify: `packages/features/src/shared/vehicle-form/vehicle-form.tsx`

- [ ] **Step 1: Replace the color `<Input>` with `<ColorSelect>`**

In `packages/features/src/shared/vehicle-form/vehicle-form.tsx`:

1. Add the import at the top (next to the existing `VehicleTypeSelect` import):

   ```ts
   import { VehicleTypeSelect } from "./vehicle-type-select";
   import { ColorSelect } from "../color-select/color-select";
   ```

2. Replace lines 137–144 (the current color input block):

   ```tsx
   <div className="space-y-2">
     <Label>{t("vehicles.color.label")}</Label>
     <Input
       value={color}
       onChange={(e) => { setColor(e.target.value); notify("color", e.target.value); }}
       placeholder={t("vehicles.color.placeholder")}
     />
   </div>
   ```

   with:

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

   Keep the surrounding state (`color`, `setColor`) and the `notify` call shape unchanged.

- [ ] **Step 2: If the `Input` import is no longer used elsewhere in the file, remove it**

Check the remaining uses of `Input` in `vehicle-form.tsx`. As of today, `Input` is used for `brand`, `model`, `plate` — so it stays. No change to the import.

- [ ] **Step 3: Run the features test suite**

```bash
pnpm --filter @ramcar/features test
```

Expected: all tests pass. If a pre-existing `vehicle-form` test typed a free-text color, that assertion will have to change; at the time of this plan there is no dedicated `vehicle-form` test file that exercises the color field.

- [ ] **Step 4: Commit**

```bash
git add packages/features/src/shared/vehicle-form/vehicle-form.tsx
git commit -m "feat(vehicle-form): use ColorSelect for vehicle color field"
```

---

## Task 10: Workspace-wide verification (lint / typecheck / tests / shared-features guard)

**Files:** none — this is a verification-only task.

- [ ] **Step 1: Typecheck the whole workspace**

```bash
pnpm typecheck
```

Expected: exit 0.

- [ ] **Step 2: Lint**

```bash
pnpm lint
```

Expected: exit 0.

- [ ] **Step 3: Run all tests**

```bash
pnpm test
```

Expected: exit 0. (Runs Vitest in `packages/features`, `packages/ui`, `packages/shared`, and Jest in `apps/api`.)

- [ ] **Step 4: Run the shared-features policy check**

```bash
pnpm check:shared-features
```

Expected: exit 0. This guards against the new `color-select` directory accidentally importing `next/*`, `"use client";`, `window.electron`, or a concrete i18n library.

- [ ] **Step 5: Manual smoke test — web portal (Spanish locale)**

In a second terminal:

```bash
pnpm dev
```

Then:
1. Open the web portal at the Spanish URL (e.g. `http://localhost:3000/es/...`).
2. Navigate to a resident with vehicles, open the "new vehicle" flow (or wherever `VehicleForm` renders).
3. Click the color field. Confirm the popover opens with 7 grouped categories and a search box.
4. Type `"cafe"`. Confirm the brown entries filter in.
5. Clear search. Press ArrowDown twice, Enter. Confirm a color is picked and the popover closes.
6. Re-open the popover. Click "+ Agregar color personalizado". The browser's basic color picker opens. Pick a shade. Confirm the popover closes and the trigger now shows the selected swatch + its HEX code.
7. Re-open the popover. Confirm the `Actual` row appears near the top showing the custom HEX.

If any step fails, STOP and report — do not commit a patch without root-cause analysis.

- [ ] **Step 6: Manual smoke test — desktop guard booth**

```bash
pnpm --filter @ramcar/desktop dev
```

Then: open the guard booth's visitor flow that adds a vehicle, repeat the flow above (in whichever locale the desktop defaults to). Confirm the popover, search, keyboard nav, and native picker all work identically. Confirm that a network-disabled state (offline) does not change behavior (the component is purely presentational).

- [ ] **Step 7: Final report**

Produce a short summary to the user listing:
- Git SHAs of each task's commit.
- Results of each verification command (exit codes, test counts).
- Any caveats discovered during smoke testing.

Do NOT push. Do NOT open a PR unless the user explicitly asks.

---

## Plan-level self-review notes

- **Every spec section is covered.** Q1 legacy handling → Task 5 (legacy variant) + Task 7 (native picker). Q2 custom one-off → Task 7 handlers. Q3 100-entry catalog → Task 2. Q3b unique HEX → Task 2 invariant test. Q3c effect rendering → Task 5 swatch variants. Q4 search matching → Task 3 helpers + Task 6 filter. Q5 primitives → Task 1. i18n → Task 4. Integration → Task 9. Shared-features compliance → Task 10.
- **The `visit-person-access-event-form.tsx` swatch enhancement described in spec §6.2 is intentionally NOT in this plan** — the spec flagged it as optional. If the user wants it, it's a small follow-up (~10 LOC) that can be added at the end of Task 9 or a Task 9b.
- **No `tenant_custom_vehicle_colors` work** — per the spec, that's a future extension, not in scope.
- **No DB/API/outbox changes** — confirmed across all tasks.
- **Type names consistent across tasks.** `ColorEntry`, `ColorCategory`, `ColorEffect`, `COLOR_CATALOG`, `COLOR_CATEGORIES`, `lookupByHex`, `normalizeHex`, `isHex`, `normalizeSearch`, `buildSearchToken`, `ColorSelect`, `ColorSelectProps` — same names used from introduction through consumer integration.
- **No placeholders / TBDs.** Every code block is complete enough to run as-is.
