/**
 * Contract: BRAND_LOGO_REGISTRY (frozen TypeScript map)
 *
 * The single source of truth that pairs every canonical brand name with its
 * bundler-resolved logo asset URL. Used by getBrandLogoUrl() and validated by
 * the CI orphan-check script.
 *
 * Implementation: `packages/features/src/shared/vehicle-brand-logos/logo-registry.ts`
 * Tests: `packages/features/src/shared/vehicle-brand-logos/logo-registry.test.ts`
 */

/**
 * Shape:
 *   - Keys MUST exactly match a key from VEHICLE_BRAND_MODEL (spec 016 dataset).
 *   - Values MUST be non-empty strings — bundler-resolved static asset URLs.
 *
 * The registry MUST be created via Object.freeze() and the resulting type
 * MUST be Readonly<Record<string, string>>.
 */
export type BrandLogoRegistry = Readonly<Record<string, string>>;

/**
 * Behavioral contract — every assertion MUST hold.
 *
 * R1 (frozen):
 *   Object.isFrozen(BRAND_LOGO_REGISTRY) === true
 *
 * R2 (complete coverage):
 *   For every key k in VEHICLE_BRAND_MODEL:
 *     typeof BRAND_LOGO_REGISTRY[k] === "string" && BRAND_LOGO_REGISTRY[k].length > 0
 *
 * R3 (closed key set):
 *   For every key k in BRAND_LOGO_REGISTRY:
 *     k is a key of VEHICLE_BRAND_MODEL
 *
 * R4 (alphabetical ordering — review hygiene):
 *   Object.keys(BRAND_LOGO_REGISTRY) is sorted with Intl.Collator localeCompare.
 *   Asserted at unit-test level. NOT enforced at runtime.
 *
 * R5 (one URL per asset):
 *   The set of values has cardinality === Object.keys(BRAND_LOGO_REGISTRY).length.
 *   (No two brands share a URL — no accidental file reuse.)
 *
 * R6 (URLs reference bundled assets):
 *   Each URL is the result of a static `import x from "./assets/<slug>.svg"`.
 *   Build-time bundlers (Next.js webpack, Vite/rollup) emit it as a fingerprinted
 *   static asset URL. The URL MUST NOT be authored manually (e.g., as a string
 *   literal) — that would defeat asset-pipeline fingerprinting and offline
 *   bundling.
 */

/**
 * Reference shape (pseudocode — actual file authors the imports explicitly):
 *
 *   import nissanLogo     from "./assets/nissan.svg";
 *   import chevroletLogo  from "./assets/chevrolet.svg";
 *   // ...one import per brand, alphabetical by canonical name...
 *
 *   export const BRAND_LOGO_REGISTRY: Readonly<Record<string, string>> = Object.freeze({
 *     BYD:        bydLogo,
 *     Chevrolet:  chevroletLogo,
 *     Chirey:     chireyLogo,
 *     Ford:       fordLogo,
 *     GMC:        gmcLogo,
 *     Honda:      hondaLogo,
 *     Hyundai:    hyundaiLogo,
 *     JAC:        jacLogo,
 *     Jeep:       jeepLogo,
 *     Kia:        kiaLogo,
 *     Mazda:      mazdaLogo,
 *     MG:         mgLogo,
 *     Nissan:     nissanLogo,
 *     Peugeot:    peugeotLogo,
 *     RAM:        ramLogo,
 *     Renault:    renaultLogo,
 *     SEAT:       seatLogo,
 *     Subaru:     subaruLogo,
 *     Toyota:     toyotaLogo,
 *     Volkswagen: volkswagenLogo,
 *   });
 */
