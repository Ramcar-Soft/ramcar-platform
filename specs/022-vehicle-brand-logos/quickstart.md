# Quickstart — Vehicle Brand Logos

**Audience**: an engineer implementing this feature, or a reviewer verifying it locally.

This is the operational side of [plan.md](./plan.md). It contains the exact commands you run, the file paths you touch, and the success signals you expect.

---

## Prerequisites

- Node 22 LTS, pnpm installed, repo cloned, `pnpm install` already done.
- Local Supabase running for end-to-end verification (`pnpm db:start`). NOT required for unit tests or the orphan-check script.
- Both `apps/web` (Next.js dev) and `apps/desktop` (Electron + Vite) buildable on your machine.

This feature does NOT require a DB migration, an API restart, or any environment-variable change.

---

## Task 1 — Stage the asset directory and registry skeleton

```bash
mkdir -p packages/features/src/shared/vehicle-brand-logos/assets
```

Create the slug helper, the registry placeholder, the lookup function, the SVG type declaration, and the rendering component:

- `packages/features/src/shared/vehicle-brand-logos/slugify.ts` — implements `slugify()` per data-model §3.
- `packages/features/src/shared/vehicle-brand-logos/logo-registry.ts` — exports `BRAND_LOGO_REGISTRY` per `contracts/logo-registry.contract.ts`.
- `packages/features/src/shared/vehicle-brand-logos/get-brand-logo-url.ts` — exports `getBrandLogoUrl()` per `contracts/get-brand-logo-url.contract.ts`.
- `packages/features/src/shared/vehicle-brand-logos/vehicle-brand-logo.tsx` — exports `<VehicleBrandLogo />` per `contracts/vehicle-brand-logo.contract.tsx`.
- `packages/features/src/shared/vehicle-brand-logos/index.ts` — public barrel: `getBrandLogoUrl`, `BRAND_LOGO_REGISTRY`, `VehicleBrandLogo`, `VehicleBrandLogoSize`, `VehicleBrandLogoProps`.
- `packages/features/src/shared/vehicle-brand-logos/svg.d.ts` — `declare module "*.svg" { const url: string; export default url; }`.

Re-export the new component from the sibling barrel so existing consumers can import from `@ramcar/features/shared`:

- Add to `packages/features/src/shared/index.ts`: `export { VehicleBrandLogo, getBrandLogoUrl } from "./vehicle-brand-logos";`.

Add the package export entry:

- Edit `packages/features/package.json` `exports`:

  ```json
  "./shared/vehicle-brand-logos": "./src/shared/vehicle-brand-logos/index.ts",
  ```

Verify scaffolding compiles:

```bash
pnpm --filter @ramcar/features typecheck
```

Expected: clean exit. If it complains about missing SVG imports, you have not added `svg.d.ts` yet.

---

## Task 2 — Drop in the SVG assets

For every key in `packages/features/src/shared/vehicle-brand-model/data.ts`:

1. Find the matching SVG in the upstream dataset (`filippofilip95/car-logos-dataset`'s optimized SVG path).
2. Save it as `packages/features/src/shared/vehicle-brand-logos/assets/<slug>.svg` where `<slug> = slugify(canonicalName)`.
3. Add the import + registry entry in `logo-registry.ts` (alphabetically by canonical name).

For brands the dataset does not include verbatim (e.g., "Chirey" vs upstream "Chery"):

- Use the closest visual match if it is the same manufacturer (Chirey is the Mexico brand of Chery — same logo).
- Otherwise add a TODO comment in the registry and ship without that brand's logo. The CI check (`check:vehicle-brand-logos`) will fail with `Missing logo for brand "<X>"` until you address it; that gate is intentional per FR-014.

Run the orphan check locally:

```bash
pnpm check:vehicle-brand-logos
```

Expected on success:

```
✓ vehicle-brand-logos check
  • 20 brands, 20 logos — registry complete & closed
  • assets/ size <KB> / 500 KB budget
  • LICENSE-third-party.md OK
```

---

## Task 3 — License attribution

Create `LICENSE-third-party.md` at repo root if it doesn't already exist (verify via `ls /Users/.../ramcar-platform/`). Append (or create) a section:

```
## Vehicle Brand Logos

The SVG brand marks under packages/features/src/shared/vehicle-brand-logos/assets/
are sourced from the filippofilip95/car-logos-dataset project
(https://github.com/filippofilip95/car-logos-dataset), distributed under the MIT License.

Brand marks remain the property of their respective owners.
```

Re-run the orphan check; the `LICENSE-third-party.md OK` line confirms the attribution gate.

Wire the attribution string into the About surface of each app:

- **`apps/web`**: add a single line under whatever existing About / Acknowledgements page exists (search for the existing `app-version` render). If no About page exists, defer to a follow-up — the file-presence check above already satisfies SC-009 for this iteration.
- **`apps/desktop`**: same guidance — add to the existing About modal if present.

---

## Task 4 — Wire `<VehicleBrandLogo />` into the brand picker

Edit `packages/features/src/shared/vehicle-brand-model/vehicle-brand-select.tsx`:

1. Import: `import { VehicleBrandLogo } from "../vehicle-brand-logos";`.
2. Inside each `CommandItem` for known brands, prefix the existing `<span>` text with `<VehicleBrandLogo size="sm" brand={brand} />` and wrap both in a `flex items-center gap-2` row.
3. Inside the `PopoverTrigger` button, prefix the displayLabel span with `<VehicleBrandLogo size="sm" brand={value} />` so a committed value shows its mark next to the name.
4. The free-text fallback row stays without a logo (it is unknown by definition; the CommandItem for `__add_custom__` does not call `<VehicleBrandLogo />`).

Re-run the feature unit tests:

```bash
pnpm --filter @ramcar/features test
```

Expected: existing tests stay green, plus new component tests added in Task 5.

---

## Task 5 — Adopt the logo on read-side surfaces

Two-line edits in each consumer:

### A. `vehicle-manage-list.tsx`

```diff
- <span className="truncate">{formatVehicleLabel(v)}</span>
+ <span className="flex items-center gap-2 truncate">
+   <VehicleBrandLogo brand={v.brand} />
+   <span className="truncate">{formatVehicleLabel(v)}</span>
+ </span>
```

### B. `visit-person-access-event-form.tsx`

Replace both `<span>{formatVehicleLabel(v)}</span>` sites with the same flex-row pattern.

### C. Web logbook columns (`apps/web/src/features/logbook/components/{visitors,providers,residents}-columns.tsx`)

Convert the `formatVehicleSummary(item)` cell from a string return to a JSX cell:

```diff
- // returns "ABC-123 — Toyota"
- function formatVehicleSummary(item) { ... }
+ function VehicleSummaryCell({ item }) {
+   return (
+     <span className="flex items-center gap-2">
+       <VehicleBrandLogo brand={item.vehicle.brand ?? null} />
+       <span>{plate && brand ? `${plate} — ${brand}` : (plate || brand || "")}</span>
+     </span>
+   );
+ }
```

Update the column definition's `cell` to render `<VehicleSummaryCell item={...} />` instead of the string.

### D. Vehicle detail / cards

Search for `(vehicle\.|v\.)brand` in `apps/web/src/features/{residents,visitors,providers}/` and `apps/desktop/src/features/{residents,visitors,providers}/` and apply the same flex-row pattern next to every brand text rendering.

---

## Task 6 — Verify in `apps/web`

```bash
pnpm --filter @ramcar/web dev
```

Open `http://localhost:3000`, log in as an Admin or Guard, navigate to a Resident's vehicles tab, click "Add vehicle":

- Brand picker: type "nis". The Nissan suggestion row shows the Nissan logo to the left.
- Press Enter. The brand input still shows the Nissan logo next to "Nissan".
- Save the vehicle. In the vehicle list, the row shows the Nissan logo + plate + brand.
- Add a second vehicle with brand text "Made-Up Brand" via the free-text fallback. In the list, that row shows the placeholder tile (no broken image) and aligns vertically with the Nissan row.
- Toggle dark mode. Both rows still show their logos legibly on the dark surface.
- Open DevTools → Network. Filter for `.svg`. You see only `_next/static/media/...svg` URLs. No external host (no `raw.githubusercontent.com`, no CDN).

---

## Task 7 — Verify in `apps/desktop`

```bash
pnpm --filter @ramcar/desktop dev
```

In the Electron app:

- Navigate to "Visitor access" → "New visit" → vehicle form.
- Brand picker behavior is identical to web.
- Disable the network (System → Network → off, or add a DevTools throttling profile of "Offline").
- Re-open the brand picker. Logos still render. (They are bundled into the Vite build and served from the local `dist/` directory.)
- Re-enable the network. The committed visit syncs through the existing outbox transport. No logo regression.

---

## Task 8 — Run the full test suite

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm check:shared-features
pnpm check:vehicle-brand-logos
pnpm --filter @ramcar/web test:e2e -- vehicle-brand-logos
```

All MUST pass before a merge. Notable assertions inside these:

- `getBrandLogoUrl.test.ts` covers behavior contracts B1–B8.
- `logo-registry.test.ts` covers invariants R1–R5.
- `slugify.test.ts` covers I-S1–I-S4.
- `vehicle-brand-logo.test.tsx` covers V1–V10.
- The Playwright e2e (`apps/web/tests/e2e/vehicle-brand-logos.spec.ts`) covers SC-002 (zero external fetch), SC-004 (free-text fallback no broken image), SC-005 (offline desktop is covered by a separate desktop integration test).
- The orphan-check script covers SC-001 and SC-010.
- `shared-features.json` (with `vehicle-brand-logos` listed) covers SC-008.
- A separate budget check inside the orphan script covers SC-007.

---

## Verification checklist (mirror of spec §"Success Criteria")

| ID | Verified by |
| --- | --- |
| SC-001 | `pnpm check:vehicle-brand-logos` passes (closed registry both directions). |
| SC-002 | Playwright e2e network-listener assertion: zero external `.svg` fetches. |
| SC-003 | Existing search benchmark in spec 016 stays under 50 ms; logo lookup adds O(1) Map.get on top, asserted by an additional micro-benchmark in `get-brand-logo-url.bench.ts`. |
| SC-004 | Vitest integration test creates a vehicle through the free-text fallback and asserts no `<img>` tag is rendered for that row across the brand picker, `vehicle-manage-list`, and the logbook column. |
| SC-005 | Desktop integration test that disables the renderer's network and asserts logos render from local bundled URLs. |
| SC-006 | Visual snapshot tests across autocomplete row, vehicle-manage-list row, and vehicle detail header — all assert identical computed dimensions for known and unknown brand rows. |
| SC-007 | `pnpm check:vehicle-brand-logos` enforces 500 KB budget. |
| SC-008 | `pnpm check:shared-features` already enforces no per-app duplicate; we extend `shared-features.json` with `vehicle-brand-logos` so it is listed. |
| SC-009 | `LICENSE-third-party.md` presence + substring check inside `pnpm check:vehicle-brand-logos`. |
| SC-010 | Intentionally introduce a mismatch in a CI dry-run branch, observe the build fail, revert. (One-time manual verification before this feature merges.) |

---

## Adding a new brand later (operational runbook)

A future PR that introduces a new brand to the dataset MUST also:

1. Append the canonical name to `VEHICLE_BRAND_MODEL` in `data.ts`.
2. Drop the new SVG into `packages/features/src/shared/vehicle-brand-logos/assets/<slug>.svg`.
3. Add the import + registry entry in `logo-registry.ts` (alphabetical placement).
4. Run `pnpm check:vehicle-brand-logos` locally — the script confirms the registry stays closed and balanced.
5. Confirm `pnpm --filter @ramcar/features test` stays green.

CI will reject the PR if any of (1)–(4) is missed (FR-014).
