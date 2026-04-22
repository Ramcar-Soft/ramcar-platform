# Quickstart: Vehicle Select Color Swatch

**Feature**: 017-vehicle-select-color-swatch
**Purpose**: Manually verify the three vehicle selects across both host apps, in both locales, against the five edge-case vehicle shapes the spec identifies.

## Prerequisites

- Local Supabase running: `pnpm db:start`
- Seed data loaded with vehicles covering all color cases (see §1 below).
- Web dev server: `pnpm --filter @ramcar/web dev`
- Desktop dev: `pnpm --filter @ramcar/desktop dev` (or run the Electron build per the desktop app's existing instructions).

## 1. Seed fixtures

Ensure the local database contains at least these five vehicles for a single resident in the current tenant. Add them via the vehicle-form UI or a seed SQL if one is wired up — the exact insertion path is out of scope for this quickstart.

| Vehicle      | `brand`    | `model`   | `plate`    | `color`           | Expected rendering                              |
|--------------|------------|-----------|------------|-------------------|-------------------------------------------------|
| V-Catalog-EN | `Toyota`   | `Avanza`  | `HASD-123` | `#FFFFFF`         | White dot + "White" (en) / "Blanco" (es)        |
| V-Catalog-EFFECT | `Nissan` | `Leaf`  | `LEAF-001` | (chameleon catalog hex) | Conic-gradient dot + translated effect name |
| V-CustomHex  | `Ford`     | `Focus`   | `FOC-777`  | `#123ABC`         | Flat dot at `#123ABC` + label `#123ABC`         |
| V-Legacy     | `Honda`    | `Civic`   | `CIV-001`  | `"off-white"`     | Dashed-border empty dot + label `off-white`     |
| V-NoColor    | `Mazda`    | `3`       | `MZ3-999`  | `null`            | No dot, no color label — identity only          |

The spec also calls out a vehicle where brand/model/plate are all null but `vehicleType` is set — reuse any of the above with those fields cleared to test the fallback path.

## 2. Verification — web portal (apps/web)

### Form A: Resident access event form (`apps/web/src/features/residents/components/access-event-form.tsx`)

1. Navigate to a resident detail page that exposes the "New access event" action.
2. Open the vehicle select.
3. For each of the five fixtures, confirm the `SelectItem` renders:
   - Vehicle identity string (`Brand Model — PLATE` or the `vehicleType` fallback).
   - The swatch dot per the Expected rendering column.
   - The localized color name per the Expected rendering column.
   - **No `#` character** in the visible text for catalog vehicles.
4. Select the V-Catalog-EN vehicle and confirm the **closed trigger** shows the same swatch + localized name (not raw hex).
5. Switch the locale to `es` via the language switcher. Reopen the select. Confirm "White" has become "Blanco" for V-Catalog-EN without reloading the page.

### Form B: Visitor access event form (shared: `packages/features/src/visitors/components/visit-person-access-event-form.tsx`, consumed in web)

1. Navigate to a visitor entry point that renders the shared visitor access event form (e.g., the visitor access log flow).
2. Repeat the 5-fixture matrix above.
3. Repeat the locale switch verification.

## 3. Verification — desktop booth (apps/desktop)

### Form C: Resident access event form (`apps/desktop/src/features/residents/components/access-event-form.tsx`)

1. Boot the desktop app. Log in as a guard.
2. Navigate to the access-event creation flow for a resident.
3. Repeat the 5-fixture matrix.
4. Switch the desktop locale (via desktop settings / language switcher). Reopen the select. Confirm color names swap.

### Form D: Visitor access event form (same shared module, consumed in desktop)

1. Navigate to the visitor access event flow in the guard booth.
2. Repeat the 5-fixture matrix.
3. Repeat the locale switch verification.

## 4. Static checks

Run from repo root:

```bash
pnpm typecheck          # must pass across all workspaces
pnpm lint               # must pass
pnpm --filter @ramcar/features test   # includes the new format-vehicle-label test
```

## 5. Regression check — existing ColorSelect unchanged

Open the vehicle **create/edit** form (where `ColorSelect` itself is used, not the vehicle select dropdown). Confirm:

- The trigger still shows the swatch + localized name for every variant (flat catalog, custom hex, chameleon, chrome, legacy, none).
- Opening the popover still shows all catalog categories, the "Add custom color" action, the "Current" row for custom hexes, and every row's swatch.

If any of the above behavior has drifted, the `Swatch` promotion was not purely additive — investigate before merging.

## 6. Dedup verification

From repo root:

```bash
grep -rn "function formatVehicleLabel" \
  apps/web/src apps/desktop/src packages/features/src \
  --include="*.ts" --include="*.tsx"
```

Expected output: exactly **one** match, inside `packages/features/src/shared/vehicle-label/format-vehicle-label.ts`.

```bash
grep -rn "formatVehicleLabel" \
  apps/web/src apps/desktop/src packages/features/src \
  --include="*.ts" --include="*.tsx"
```

Expected: the definition above plus three call-site imports (web access-event form, desktop access-event form, shared visitor access-event form) plus one test file.

## 7. Done criteria

- All five fixture rows render correctly in each of the four form/host combinations (A-web, B-web, C-desktop, D-desktop).
- Locale switch swaps color names without reload.
- Trigger (closed select) mirrors the list row rendering.
- `pnpm typecheck`, `pnpm lint`, and `pnpm --filter @ramcar/features test` all green.
- `grep` commands in §6 return the expected single definition and import count.
- `ColorSelect` itself behaves identically to pre-feature baseline.
