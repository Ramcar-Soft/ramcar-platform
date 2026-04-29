# Phase 0 Research — Vehicle Brand Logos

**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Branch**: `022-vehicle-brand-logos` · **Date**: 2026-04-28

This document resolves every "NEEDS CLARIFICATION" raised by the spec. The output is one Decision per topic with Rationale and Alternatives Considered.

---

## 1. Source dataset & license

**Decision**: Use [`filippofilip95/car-logos-dataset`](https://github.com/filippofilip95/car-logos-dataset) — the dataset called out by the user — as the canonical source. We harvest **only the brands present in `VEHICLE_BRAND_MODEL`** (~20 today), copy the assets into our repository at `packages/features/src/shared/vehicle-brand-logos/assets/<brand-slug>.svg`, and commit them. We do NOT consume the upstream repo at runtime, do NOT use a git submodule, and do NOT use `raw.githubusercontent.com` URLs.

**Rationale**:

- The user's open question — "git URLs vs. bundle into our repo" — is answered by the constitution: Principle IV (Offline-First Desktop) makes any runtime fetch a non-starter for the guard booth. Bundling is the only path that satisfies offline-first and FR-013.
- `filippofilip95/car-logos-dataset` ships SVG assets at icon scale already optimized for UI (~1–6 KB each). The brand spelling roughly matches our dataset; mapping from our canonical key to a filename is a one-line slug.
- Copying the subset we need (instead of vendoring the whole repo) keeps our installer small and avoids importing brands we never render.
- Upstream license: MIT (verified by reading the repo's `LICENSE` file). MIT permits redistribution provided the copyright notice is preserved. We satisfy this in §11 (License attribution).

**Alternatives considered**:

- **Git submodule pointing at the upstream repo.** Rejected: fragile (submodules break offline `pnpm install` and CI clones), and we would still re-bundle the assets at build time anyway.
- **Run-time fetch from `raw.githubusercontent.com` or a CDN.** Rejected: violates Principle IV and FR-013; one outage at the upstream host degrades guard-booth UX even when "online"; cache invalidation is the upstream repo's call, not ours.
- **A different logo dataset (e.g., `simple-icons` brands subset, `Vehicle-Brand-Logos`-style aggregators).** Rejected: `simple-icons` excludes most automakers as policy. Other aggregators are unmaintained or carry restrictive licenses. The user named `filippofilip95/car-logos-dataset` — we honor that unless we hit a license problem, and we did not.
- **Author our own SVG marks from each manufacturer's press kit.** Rejected: high effort, drift risk, and most manufacturer press kits have strict trademark guidelines that are stricter than redistributing already-public icon-scale marks under MIT.

---

## 2. Asset format on disk: SVG (decision) vs PNG / WebP variants

**Decision**: **SVG** is the canonical bundled format. One SVG per brand. No PNG fallbacks, no per-resolution variants, no per-theme variants.

**Rationale**:

- SVG renders crisp on any DPR and at any rendered size — matches the "high-DPI displays" edge case in the spec without per-resolution duplication.
- One file per brand is the simplest possible orphan model (§9), which keeps the CI duplication check trivial.
- File size is the smallest of the realistic options: per-brand SVGs in the upstream dataset are ~1–6 KB. 20 brands × ~5 KB = ~100 KB ungzipped, well under the 3 MB budget (§8). PNG-256 would be 5–15× larger.
- SVG is text — `git diff` is meaningful, code review can spot accidental black-rectangle replacements, and CI can do a one-line "is the file non-empty and starts with `<svg`?" sanity check (§9).

**Alternatives considered**:

- **PNG at 2× and 3× DPR variants.** Rejected: triples the asset count and budget for no UX gain at icon scale. The orphan model gets messier (which DPR counts as "the" asset?).
- **WebP at one large size, downscaled by the renderer.** Rejected: similar size to PNG, blurrier than SVG when scaled, no advantage at icon scale.
- **Inlined data: URIs in the dataset module.** Rejected: defeats `pnpm` bundler tree-shaking (every consumer pays for every brand), and inflates the JS bundle instead of the static-asset bundle, which gzips less efficiently.

---

## 3. Asset key & lookup normalization

**Decision**: The lookup key is the **canonical brand name** from `VEHICLE_BRAND_MODEL` (spec 016), normalized via the **same `normalizeForSearch`** helper already exported from `@ramcar/features/shared/vehicle-brand-model/search.ts`. The on-disk filename uses a deterministic slug derived from that canonical name (lowercase, ASCII-only, hyphenated). Mapping from canonical name → filename is encoded in a single source-of-truth registry module that lives next to the assets.

**Rationale**:

- Reusing `normalizeForSearch` (case-insensitive, diacritic-insensitive, whitespace-trimmed) means the post-save logo lookup matches the brand picker's matching exactly — required by spec User Story 3 acceptance scenario 3 ("TOYOTA " with whitespace and uppercase still resolves to the Toyota logo).
- A single registry module makes the orphan check (§9) a static analysis: no filesystem walk, no glob magic, just a TypeScript map with explicit imports.
- Slugified filenames (`volkswagen.svg`, `ram.svg`, `mg.svg`) are git-friendly and case-insensitive across macOS/Windows/Linux.

**Slug rules** (lock these in `vehicle-brand-logos/slugify.ts`):

1. NFD-normalize, strip combining marks (so "SEAT" stays `seat`, accents lose their accents).
2. Lowercase.
3. Replace any non-`[a-z0-9]` run with a single `-`.
4. Trim leading/trailing `-`.

Examples drawn from `VEHICLE_BRAND_MODEL`:

| Canonical brand | Filename       |
| --------------- | -------------- |
| Nissan          | `nissan.svg`   |
| Volkswagen      | `volkswagen.svg` |
| RAM             | `ram.svg`      |
| MG              | `mg.svg`       |
| BYD             | `byd.svg`      |
| Bronco Sport*   | n/a (model, not brand) |

\* Models are not in the brand-logo registry — only top-level brand keys.

**Alternatives considered**:

- **Hand-author the slug per brand.** Rejected: drift risk; slug rules are deterministic, so we encode them in `slugify.ts` and assert in tests that every brand in `VEHICLE_BRAND_MODEL` produces a unique slug.
- **Use the canonical name as the filename.** Rejected: spaces, accents, and case collide on case-insensitive filesystems. Slug is safer.

---

## 4. Lookup function & rendering component shape

**Decision**: Two new modules in a new slice `packages/features/src/shared/vehicle-brand-logos/`:

- **`logo-registry.ts`** — Exports `BRAND_LOGO_REGISTRY: Readonly<Record<string, string>>`, a frozen map from canonical brand name → asset URL. Each value is the result of a static `import nissanLogo from "./assets/nissan.svg"` (URL string under both Next.js and Vite default behavior — see §10). Also exports `getBrandLogoUrl(brand: string | null | undefined): string | null` which normalizes via `normalizeForSearch`, looks up, and returns the URL or `null` for any brand that does not resolve.
- **`vehicle-brand-logo.tsx`** — Exports `<VehicleBrandLogo brand={...} size="sm|md" />`. Renders an `<img>` tag wrapped in a tile (`bg-muted rounded` for theme-friendly placement) with the resolved URL, or a neutral placeholder (`<span>` with the same dimensions) when the URL is `null`. Width/height are pinned at the chosen tile size (no layout shift, FR-015). Includes `aria-hidden="true"` because the brand text is rendered alongside it as the accessible label.

**Sizes** (set in plan-phase, finalized here): `sm = 16×16` (used inside autocomplete rows and inline-with-text cells), `md = 24×24` (used in the committed-value side of the brand input and in vehicle detail headers). Tile size is `size + 4 px` padding to keep colored marks legible against background.

**Rationale**:

- A function that returns the URL (not the React element) is what list/cell consumers actually want. They render the brand text themselves and just need the icon URL or null.
- A dedicated `<VehicleBrandLogo>` component centralizes the placeholder rule (FR-007), the alt-text rule (`aria-hidden` because the brand text is always next to it), the dimension contract (FR-015), and the tile/theme rule (§5).
- Two sizes are enough — autocomplete rows want a small mark; committed-value chips and detail headers want a slightly larger mark. Adding more sizes later is a non-breaking change.

**Alternatives considered**:

- **A single `getBrandLogoElement(brand)` that returns JSX.** Rejected: doesn't compose well with table-cell consumers that want to choose their own layout. We export both — a function for raw-URL needs and a component for the common case.
- **Render the SVG inline with `currentColor` for theming.** Rejected: most brand marks use brand colors (Toyota red, Volkswagen blue) that we do NOT want to override. The neutral-tile approach handles dark mode without re-coloring the mark.

---

## 5. Theme handling (light vs dark mode)

**Decision**: **Single asset per brand on a neutral rounded tile.** Tile background is `bg-white dark:bg-zinc-100` (a near-white tile that stays light in both themes), which keeps colored brand marks legible on dark surfaces without per-theme variants.

**Rationale**:

- Brand marks in `filippofilip95/car-logos-dataset` are full-color (Toyota red on transparent, Honda red, Ford blue, etc.). Inverting them per-theme would distort brand identity and is rejected by most trademark guidelines.
- Real-world precedent: Apple's Wallet, Google Pay, Slack's "connections" surface, and most CRMs all render brand marks on a neutral light tile in both themes for the same reason. We match that pattern.
- A single asset is the simplest orphan model (§9) and the smallest budget cost (§8).

**Alternatives considered**:

- **Per-theme variants (`brand.svg` + `brand-dark.svg`).** Rejected: doubles the asset count and the orphan-detection complexity, and the upstream dataset only ships one variant per brand. Authoring "dark" variants ourselves would drift the marks away from manufacturer guidance.
- **Render the mark over `currentColor`.** Rejected: most marks are not single-color. Forcing single-color rendering would visibly dim/distort brands like Volkswagen (blue circle), Hyundai (silver oval), or RAM (red ram-head).

---

## 6. Rendering surfaces in scope

**Decision**: Author the lookup once and adopt it on every surface listed in spec §"Surfaces in scope". Concretely:

| Surface                                                                                            | Adoption                                                                                                                              |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Brand picker — suggestion rows** (`packages/features/.../vehicle-brand-select.tsx`)              | Render `<VehicleBrandLogo size="sm" brand={brand} />` to the left of the brand text inside each `CommandItem`.                        |
| **Brand picker — committed value** (same component, the `PopoverTrigger` button)                   | Render `<VehicleBrandLogo size="sm" brand={value} />` inside the trigger button, before the displayLabel span.                        |
| **`formatVehicleLabel` consumers** (`vehicle-manage-list`, visitor access-event vehicle cell)      | Replace the bare `<span>{formatVehicleLabel(v)}</span>` with a small flex row: `<VehicleBrandLogo size="sm" /> + label span`.         |
| **Logbook tables** (`apps/web/src/features/logbook/components/{visitors,providers,residents}-columns.tsx`) | Replace the local `formatVehicleSummary(item)` string return with a small JSX cell that renders the logo + plate/brand text inline. |
| **Vehicle detail / cards in resident & visitor profiles**                                          | Same pattern. None of these surfaces own the brand string — they all already read it from a parent vehicle object.                   |

**Rationale**:

- Spec FR-003 names exactly these surfaces. Centralizing the rendering in `<VehicleBrandLogo>` means each surface adopts the same placeholder, dimension, and theme treatment with a one-line edit.
- The logbook columns currently use a string-returning helper (`formatVehicleSummary`); converting to JSX cells is a localized change that does not ripple into the table's TanStack Table column definition (the cell renderer is what changes).

**Out-of-scope (per spec assumption)**: PDFs, exports, email notifications, mobile app (separate repo), printed receipts. These keep the existing text-only path; adding the logo there is a future, additive change.

**Alternatives considered**:

- **Adopt only on the brand picker (P1) in this iteration; defer P2 surfaces.** Rejected: spec User Story 3's acceptance scenario requires "any vehicle list/table" to render without broken images, which means we already have to touch every read-side surface to delete any pending assumption that a brand string is renderable on its own. Once we touch the surface, we adopt the logo there.

---

## 7. Layout-shift contract (FR-015)

**Decision**: Every consumer renders the logo inside a fixed-size box (`flex-none w-4 h-4` for `sm`, `w-6 h-6` for `md`) so the row's vertical and horizontal rhythm is identical between known-brand rows (logo present) and free-text rows (placeholder span occupying the same box). The placeholder is a same-dimension `<span>` with `bg-muted/40 rounded` — visually unobtrusive and matches FR-007.

**Rationale**:

- Pinned dimensions are the only reliable defense against layout shift in autocomplete dropdowns and table rows. The spec explicitly calls out "no layout jumps when the dropdown opens" and "row heights and brand-cell horizontal alignment must be identical."
- Using a placeholder span instead of `null` means free-text rows still occupy the box. Without it, free-text rows would be a few pixels narrower, "raggedness" the user explicitly warned against.

**Alternatives considered**:

- **No placeholder; let free-text rows render without a box.** Rejected: violates FR-015's "row heights and brand-cell horizontal alignment must be identical."
- **Render a generic "?" placeholder for free-text brands.** Rejected: visually noisy, draws attention to a non-error state. The empty-tile placeholder is invisible enough.

---

## 8. Bundle-size budget

**Decision**: **Hard cap: 500 KB total** for all bundled brand-logo SVGs across web and desktop. Soft target: 150 KB. Verified by a CI build-size check that fails the build if `du -sb packages/features/src/shared/vehicle-brand-logos/assets/` exceeds 500 KB.

**Rationale**:

- The spec assumption sets the soft cap at "≤ ~3 MB," but the actual upstream SVGs at icon scale are ~1–6 KB each — 20 brands × 6 KB = 120 KB ungzipped, well under any reasonable concern. A 500 KB hard cap leaves room for ~5× growth without reopening this discussion.
- A hard cap that sits 4× above the realistic asset size catches real regressions (someone accidentally commits a 2 MB raster instead of an SVG; someone adds a brand with a bloated SVG that wasn't optimized) without false-positively flagging routine adds.
- 500 KB is small enough to be a non-event for the desktop installer (current installer is several hundred MB) and the web initial bundle (which serves SVGs as separate static assets, not inline JS).

**Alternatives considered**:

- **No CI budget — trust reviewers.** Rejected: SC-007 mandates a build-time check.
- **The 3 MB soft cap from the spec, hard-enforced.** Rejected: too loose; would let a regression slip through unnoticed.

---

## 9. CI orphan-detection (FR-014, SC-001, SC-010)

**Decision**: A new node script `scripts/check-vehicle-brand-logos.ts` (parallel to `scripts/check-shared-features.ts`) wired into `pnpm check:vehicle-brand-logos`, run from CI alongside the existing checks. Behavior:

1. Read the canonical brand keys from `packages/features/src/shared/vehicle-brand-model/data.ts`.
2. Read the registry module `packages/features/src/shared/vehicle-brand-logos/logo-registry.ts` and confirm:
   - Every key in `VEHICLE_BRAND_MODEL` has a matching key in `BRAND_LOGO_REGISTRY` (no missing logo for a dataset brand).
   - Every key in `BRAND_LOGO_REGISTRY` has a matching key in `VEHICLE_BRAND_MODEL` (no orphan logo).
   - Every value in `BRAND_LOGO_REGISTRY` resolves to an existing file under `assets/` (no dangling import).
   - Every file under `assets/*.svg` is referenced by `BRAND_LOGO_REGISTRY` (no abandoned file).
3. Sanity-check each `assets/*.svg` for non-zero bytes and a leading `<svg` token (catches corrupted commits).
4. Fail with a copy-paste-actionable error message that names the missing/orphan key and the exact file path.

A separate CI step asserts that **the total disk size of the assets directory** is at or below the budget set in §8.

**Rationale**:

- SC-010 explicitly mandates that adding a brand to `data.ts` without its logo (or vice versa) fails CI before merge. A static script matching `data.ts` keys against the registry is the simplest implementation of that contract.
- We model the two directions separately ("missing" vs "orphan") because the failure messages are different and reviewers benefit from precision.
- We re-use the existing CI plumbing (a `pnpm` script run as a turbo task) to avoid re-inventing the runner.

**Alternatives considered**:

- **A vitest test under `packages/features` that does the same thing.** Rejected: we want this check independent of test discovery and runnable in <1 second from any environment, including a pre-commit hook later.
- **Auto-generate the registry from the filesystem.** Rejected: works for the missing/orphan check, but breaks TypeScript's ability to type-check the static imports at build time. We keep the registry hand-authored so the bundler sees explicit imports.

---

## 10. Bundler interop — SVG import semantics across Next.js & Vite

**Decision**: Treat each SVG as a **URL string** via the default `import url from "./assets/foo.svg"` syntax. Both Next.js 14+ (web) and Vite 5 (desktop renderer) resolve this default import to a URL string out of the box, so a single registry module works for both apps.

**Rationale**:

- Next.js 14+ default behavior: importing an SVG without `@svgr/webpack` configured returns a static `string` URL (`"/_next/static/media/nissan.<hash>.svg"`). Confirmed by reading Next.js's image-asset documentation; we have no `@svgr/webpack` configured (verified by reading `apps/web/next.config.ts`).
- Vite default behavior: importing an SVG returns a static `string` URL (`"/assets/nissan-<hash>.svg"`). Confirmed against `apps/desktop/vite.config.ts` (no `vite-plugin-svgr` configured).
- Both bundlers fingerprint and copy the asset into their respective output directories at build time. No runtime fetch.
- The `transpilePackages: ["@ramcar/features"]` setting in `apps/web/next.config.ts` means Next.js also resolves asset imports from inside the package, so the registry module compiles in both apps without extra config.

**Type declaration**: The `@ramcar/features` package needs a `*.svg` module declaration (`packages/features/src/types/svg.d.ts`) declaring `declare module "*.svg" { const url: string; export default url; }` so TypeScript accepts the imports under strict mode.

**Alternatives considered**:

- **Configure `@svgr/webpack` in Next.js to render SVGs as React components.** Rejected: doubles the bundler config, and the URL approach is sufficient for raster-style icon rendering. We do not need props like `currentColor` on these brand marks (§5).
- **Use `new URL("./assets/nissan.svg", import.meta.url).href`.** Rejected: works in Vite but breaks under Next.js's webpack pipeline; would require a runtime resolver. The plain default-import is portable.
- **Place assets under each app's `public/` directory and reference by absolute URL.** Rejected: forces per-app duplication, violates the cross-app code-sharing constraint (Principle II / §"Cross-App Shared Feature Modules" in CLAUDE.md), and requires manual asset sync.

---

## 11. License attribution surface

**Decision**: Add a single attribution line in the **About** screen of each app, sourced from a new `LICENSE-third-party.md` checked in at repo root that includes the upstream `filippofilip95/car-logos-dataset` MIT notice. The About screen renders this third-party notice inline. Wording:

> Vehicle brand logos courtesy of the [`filippofilip95/car-logos-dataset`](https://github.com/filippofilip95/car-logos-dataset) project, distributed under the MIT License. Brand marks remain the property of their respective owners.

**Rationale**:

- MIT requires preservation of the copyright notice when redistributing the source. The `LICENSE-third-party.md` file at repo root preserves the notice in source. The About-screen render satisfies "discoverable location" per FR-012 and SC-009.
- A single attribution surface (not a footer everywhere) keeps the form/list UX uncluttered (FR-012 explicit non-goal: "must not block or clutter the form/list UX").
- Each app has an existing About entry point in its sidebar/menu (web: settings menu; desktop: app menu), so we don't need to invent a new route.

**CI presence check**: A one-liner in `scripts/check-vehicle-brand-logos.ts` asserts the `LICENSE-third-party.md` file exists at repo root and contains the substring `car-logos-dataset`.

**Alternatives considered**:

- **Footer of every page.** Rejected: visually intrusive, conflicts with FR-012's "must not clutter the form/list UX."
- **Hidden README in the assets directory.** Rejected: not user-discoverable, fails SC-009.

---

## 12. Renormalization & legacy data

**Decision**: No data migration. At render time, the lookup uses `normalizeForSearch` over the stored `vehicles.brand` string. Pre-existing rows with non-canonical spelling that **normalize** to a known dataset key (e.g., "TOYOTA " or "volkswagen") will start showing the corresponding logo as soon as this feature ships. Rows whose stored string does not normalize to a known key continue rendering text-only — same behavior as a free-text fallback.

**Rationale**:

- The spec explicitly states "No backfill of existing vehicles" (assumption block) and "Pre-existing vehicles from before spec 016/022 with non-canonical brand spelling: if the stored value normalizes to a known brand, the logo appears; otherwise it is treated like a free-text brand. No data migration is performed by this feature."
- Render-time normalization is cheap (every brand string normalizes in microseconds) and gives a free upgrade for legacy data without writing a migration.

**Alternatives considered**:

- **One-time backfill SQL migration normalizing every `vehicles.brand` to its canonical spelling.** Rejected by the spec; also risks corrupting genuinely intended free-text values that happen to share a normalized form (low risk but non-zero).

---

## 13. Tests we will write

For SC-001 → SC-010:

- **Vitest unit** (in `packages/features`): `logo-registry.test.ts` asserts: every brand → URL, every URL → exists in `BRAND_LOGO_REGISTRY` keys, every value is a non-empty string. Plus `vehicle-brand-logo.test.tsx` rendering tests covering known brand, unknown brand placeholder, and the no-layout-shift dimension contract.
- **Vitest unit** (`getBrandLogoUrl.test.ts`): "TOYOTA " → toyota URL; "volkswagen" → vw URL; null/undefined → null; "Made-Up Brand" → null.
- **CI script** (`scripts/check-vehicle-brand-logos.ts`): orphan + missing detection, asset-budget enforcement, attribution-file presence. Uses Vitest for the script's own unit tests so we can integrate-test the script against fixtures.
- **Playwright E2E** (`apps/web/tests/e2e/vehicle-brand-logos.spec.ts`): opens the vehicle form, exercises the brand picker (autocomplete → commit), opens a vehicle list, asserts no broken-image fetch error in the console; a network listener asserts the only logo-asset URLs hit are local Next.js static-asset URLs (zero external hosts).
- **Desktop integration** (`apps/desktop/src/test/brand-logo-offline.test.ts`): disables the renderer's network, opens the brand picker, asserts logos render. (Verifies SC-005.)
- **Visual snapshot** (`packages/features/.../__tests__/`): three snapshot tests across autocomplete row, vehicle list row, vehicle detail header — assert the fixed-dimension box renders the same height regardless of known-brand vs free-text input. (Verifies SC-006.)

**Rationale**:

- Each success criterion in the spec has at least one named test that asserts it. SC-002 (zero runtime HTTP for logo retrieval) is asserted by the Playwright network listener alongside SC-005 because they share infrastructure.
- The visual snapshot test is intentionally narrow — three surfaces, identical-height assertion. We do not snapshot pixels (jsdom can't render SVG anyway); we snapshot the rendered DOM dimensions via inline-style assertions.

---

## 14. Open questions (none)

All NEEDS CLARIFICATION items in the spec are resolved by the decisions above. Specifically:

- "git-hosted URLs vs bundled" → §1 (bundled).
- "SVG vs PNG vs both" → §2 (SVG only).
- "single asset vs per-theme" → §5 (single asset, neutral tile).
- "bundle weight budget" → §8 (500 KB hard cap, 150 KB target).
- "license attribution location" → §11 (About screen).
- "neutral placeholder for unknown brands" → §7 (yes; same-dimension empty tile).
- "lookup normalization" → §3 (reuse `normalizeForSearch` from spec 016).
- "rendering surfaces in scope" → §6 (matches spec assumption block).

The plan and Phase 1 design proceed without `[NEEDS CLARIFICATION]` markers.
