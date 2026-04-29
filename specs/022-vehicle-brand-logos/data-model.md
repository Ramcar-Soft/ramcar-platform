# Phase 1 Data Model — Vehicle Brand Logos

**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Research**: [research.md](./research.md)

## Scope

This feature is **purely a presentation layer** — it bundles static SVG assets, registers a lookup, and renders the asset alongside an existing brand text. There are:

- **No new database tables.**
- **No new API endpoints, DTOs, or query paths.**
- **No new desktop SQLite columns or outbox operation kinds.**
- **No new RLS policies.**
- **No schema change to `vehicles` or any other Postgres table.**

The data-model document below therefore describes the **static-asset entities and registry** that ship inside the application bundle. The "data" here is build-time data (a TypeScript module) and on-disk static files, not Postgres rows.

---

## 1. Brand Logo Asset (static)

### 1.1 Conceptual definition

A **Brand Logo Asset** is a single optimized SVG file that visually represents one vehicle brand at icon scale. It is bundled inside the repository under `packages/features/src/shared/vehicle-brand-logos/assets/<slug>.svg`, indexed by the canonical brand name from `VEHICLE_BRAND_MODEL` (spec 016).

### 1.2 Attributes

| Attribute | Type | Required | Source | Notes |
| --- | --- | --- | --- | --- |
| `canonicalName` | `string` (key into `VEHICLE_BRAND_MODEL`) | Yes | `data.ts` (spec 016) | The lookup key. Logo lookup normalizes input to match against this exact key set. |
| `slug` | `string` (filename stem, derived) | Yes | `slugify.ts` | Deterministic ASCII-only slug. See §3. |
| `assetPath` | `string` (relative path to the SVG) | Yes | filesystem | Always `./assets/<slug>.svg` relative to `logo-registry.ts`. |
| `fileFormat` | constant `"image/svg+xml"` | Yes | constant | All assets are SVG (research §2). |
| `bundledUrl` | `string` (resolved at build time) | Yes | bundler | Default-import returns this. Next.js: `/_next/static/media/<slug>.<hash>.svg`. Vite: `/assets/<slug>-<hash>.svg`. |

### 1.3 Validation invariants

The CI script `scripts/check-vehicle-brand-logos.ts` (research §9) enforces these statically before merge. They have IDs prefixed `I-A` (Invariant — Asset).

- **I-A1 — Closed key set.** `BRAND_LOGO_REGISTRY` keys are a subset of `Object.keys(VEHICLE_BRAND_MODEL)`. **No orphan logos** allowed.
- **I-A2 — Total coverage.** `Object.keys(VEHICLE_BRAND_MODEL)` is a subset of `BRAND_LOGO_REGISTRY` keys. **No missing logos** allowed.
  - Combined with I-A1, the two sets are exactly equal.
- **I-A3 — Asset existence.** For every `(key, url)` in `BRAND_LOGO_REGISTRY`, there exists exactly one file at `./assets/<slug>.svg` where `<slug>` matches the `slugify(key)` result.
- **I-A4 — File sanity.** Every `./assets/<slug>.svg` file is non-empty (≥ 32 bytes) and starts with `<svg` (corruption / wrong-format catch).
- **I-A5 — No abandoned files.** Every file under `./assets/` corresponds to a key in `BRAND_LOGO_REGISTRY`. (No stale SVGs left after a brand is removed.)
- **I-A6 — Slug uniqueness.** `slugify` produces a unique slug for every key in `VEHICLE_BRAND_MODEL`. (Catches future additions like "Mini" + "MINI" both slugifying to `mini`.)
- **I-A7 — Budget.** `du -sb assets/` ≤ 500 KB (research §8).

CI-script violation messages always include the offending brand key and the absolute path to the missing/orphan/oversized file.

### 1.4 State transitions

A Brand Logo Asset has no runtime state. The only "transitions" are at design-time:

```
(absent)
   │  add brand to data.ts AND add asset AND add registry entry (single PR)
   ▼
present ────────────────────────────────────────────────► (absent)
                  remove brand from data.ts AND remove asset AND remove registry entry (single PR)
```

Both transitions are atomic per FR-014: a PR that updates one without the other fails CI.

### 1.5 Examples (snapshot of the registry as it will ship in this feature)

| Canonical name | Slug | Asset path | Status |
| --- | --- | --- | --- |
| Nissan | `nissan` | `./assets/nissan.svg` | present (P1) |
| Chevrolet | `chevrolet` | `./assets/chevrolet.svg` | present |
| Volkswagen | `volkswagen` | `./assets/volkswagen.svg` | present |
| Toyota | `toyota` | `./assets/toyota.svg` | present |
| Kia | `kia` | `./assets/kia.svg` | present |
| Hyundai | `hyundai` | `./assets/hyundai.svg` | present |
| Mazda | `mazda` | `./assets/mazda.svg` | present |
| Honda | `honda` | `./assets/honda.svg` | present |
| Ford | `ford` | `./assets/ford.svg` | present |
| Jeep | `jeep` | `./assets/jeep.svg` | present |
| RAM | `ram` | `./assets/ram.svg` | present |
| GMC | `gmc` | `./assets/gmc.svg` | present |
| Subaru | `subaru` | `./assets/subaru.svg` | present |
| Renault | `renault` | `./assets/renault.svg` | present |
| Peugeot | `peugeot` | `./assets/peugeot.svg` | present |
| SEAT | `seat` | `./assets/seat.svg` | present |
| MG | `mg` | `./assets/mg.svg` | present |
| Chirey | `chirey` | `./assets/chirey.svg` | present (may need closest-match fallback to "Chery" in upstream dataset) |
| JAC | `jac` | `./assets/jac.svg` | present |
| BYD | `byd` | `./assets/byd.svg` | present |

Total: 20 brands × ~3–6 KB each ≈ 60–120 KB ungzipped. Comfortably inside the 500 KB hard cap.

---

## 2. Brand Logo Registry (in-memory map)

### 2.1 Conceptual definition

The **Brand Logo Registry** is a frozen TypeScript module-level map that pairs every canonical brand name to its bundler-resolved asset URL. It is the single source of truth for the lookup function.

### 2.2 Structure

```ts
// packages/features/src/shared/vehicle-brand-logos/logo-registry.ts
import nissanLogo     from "./assets/nissan.svg";
import chevroletLogo  from "./assets/chevrolet.svg";
import volkswagenLogo from "./assets/volkswagen.svg";
// …one import per brand, alphabetical for review-friendliness…

export const BRAND_LOGO_REGISTRY: Readonly<Record<string, string>> = Object.freeze({
  Nissan:     nissanLogo,
  Chevrolet:  chevroletLogo,
  Volkswagen: volkswagenLogo,
  // …one entry per brand, alphabetical, keys MUST match VEHICLE_BRAND_MODEL exactly…
});

export type BrandLogoKey = keyof typeof BRAND_LOGO_REGISTRY;
```

### 2.3 Validation invariants

Enforced by `logo-registry.test.ts` (Vitest) — runs in `pnpm --filter @ramcar/features test`. Prefixed `I-R` (Invariant — Registry).

- **I-R1 — Frozen.** `Object.isFrozen(BRAND_LOGO_REGISTRY) === true`.
- **I-R2 — Complete.** For every `k` in `Object.keys(VEHICLE_BRAND_MODEL)`, `BRAND_LOGO_REGISTRY[k]` is a non-empty string.
- **I-R3 — Closed.** For every `k` in `Object.keys(BRAND_LOGO_REGISTRY)`, `k` is in `Object.keys(VEHICLE_BRAND_MODEL)`.
- **I-R4 — Stable.** Successive calls return the same string reference (URL is built once at import time by the bundler).

The CI script (research §9) duplicates I-R2 and I-R3 at build time so a typo in a manual registry entry is caught even before tests run.

---

## 3. Slug derivation (build-time)

### 3.1 Function definition

```ts
// packages/features/src/shared/vehicle-brand-logos/slugify.ts
export function slugify(canonicalName: string): string {
  return canonicalName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")  // strip combining marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

### 3.2 Validation invariants (`slugify.test.ts`)

Prefixed `I-S` (Invariant — Slug).

- **I-S1 — Determinism.** `slugify(x)` returns the same string on every call.
- **I-S2 — ASCII output.** The return value matches `/^[a-z0-9-]+$/`.
- **I-S3 — No leading/trailing hyphens.** Return value matches `/^[a-z0-9].*[a-z0-9]$|^[a-z0-9]$/`.
- **I-S4 — Uniqueness over `VEHICLE_BRAND_MODEL`.** Mapping every key through `slugify` yields a `Set` whose `.size` equals `Object.keys(VEHICLE_BRAND_MODEL).length`.

I-S4 is the future-proofing invariant: it catches a future PR that adds a brand whose name slugifies to an already-taken slug. The error message points the contributor at the colliding pair so they can pick a different canonical name or a hand-overridden slug (the override mechanism is intentionally not built — we want a CI failure to force a deliberate decision rather than silent collision).

---

## 4. Lookup function (runtime)

### 4.1 Function definition

```ts
// packages/features/src/shared/vehicle-brand-logos/get-brand-logo-url.ts
import { normalizeForSearch } from "../vehicle-brand-model/search";
import { BRAND_LOGO_REGISTRY } from "./logo-registry";

const _normalizedIndex: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [canonical, url] of Object.entries(BRAND_LOGO_REGISTRY)) {
    m.set(normalizeForSearch(canonical), url);
  }
  return m;
})();

export function getBrandLogoUrl(brand: string | null | undefined): string | null {
  if (!brand) return null;
  return _normalizedIndex.get(normalizeForSearch(brand)) ?? null;
}
```

### 4.2 Behavior contract

- **B1 — Known canonical match.** `getBrandLogoUrl("Nissan")` returns the Nissan URL.
- **B2 — Case-insensitive match.** `getBrandLogoUrl("NISSAN")` returns the Nissan URL.
- **B3 — Whitespace-trim match.** `getBrandLogoUrl(" Nissan ")` returns the Nissan URL.
- **B4 — Diacritic-strip match.** `getBrandLogoUrl("Séat")` returns the SEAT URL. (The dataset key is "SEAT"; both normalize to `seat`.)
- **B5 — Unknown brand returns null.** `getBrandLogoUrl("Made-Up Brand")` returns `null`.
- **B6 — Null/undefined/empty returns null.** `getBrandLogoUrl(null)`, `getBrandLogoUrl(undefined)`, `getBrandLogoUrl("")`, `getBrandLogoUrl("   ")` all return `null` (empty/whitespace-only treated as no brand).
- **B7 — Stable URL.** Two calls with the same input return the exact same string reference (`===`).
- **B8 — O(1) lookup.** No filesystem walk, no array search; the normalized index is built once at module load (memoized). Re-import cost is dominated by the assets, not the JS.

These match the corresponding `getBrandLogoUrl.test.ts` cases in research §13.

---

## 5. Frontend data flow (unchanged from spec 016)

For completeness, this feature does NOT change the existing read/write path. Vehicle records still flow:

```
TanStack Query → NestJS API (POST/PATCH/GET /api/vehicles) → VehiclesRepository → Supabase/Postgres
```

The brand string in `vehicles.brand` continues to be the only persisted attribute related to logos. Logo lookup is purely a render-time, in-memory operation against the bundled registry.

**Allowed Supabase usage in frontend code (per Principle VIII)**: `supabase.auth.*` and `supabase.channel(...)` — unchanged. No `from()`, `rpc()`, or `storage` is added or modified.

---

## 6. Operations table

| Operation | API endpoint | HTTP method | Request DTO | Response DTO |
| --- | --- | --- | --- | --- |
| (none — no API path is introduced or modified) | — | — | — | — |

The lookup is build-time + in-memory; it has no operation table.

---

## 7. Cross-app code-sharing structure (CLAUDE.md Principle)

This feature ships entirely inside `packages/features/src/shared/vehicle-brand-logos/`, consumed identically by `apps/web` and `apps/desktop`. **No per-app duplicate** of the registry, the lookup, or the rendering component is introduced under `apps/web/src/features/` or `apps/desktop/src/features/`. The existing `pnpm check:shared-features` CI check enforces this. The shared-features manifest is amended with a new `sharedPrimitives` entry (`vehicle-brand-logos`).
