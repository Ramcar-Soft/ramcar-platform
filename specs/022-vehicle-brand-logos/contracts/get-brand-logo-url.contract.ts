/**
 * Contract: getBrandLogoUrl(brand)
 *
 * Resolves a stored vehicle brand string to a bundler-resolved URL pointing at
 * the bundled SVG logo asset. Returns null for any brand that does not match
 * the canonical dataset (free-text fallback, legacy data, empty/null inputs).
 *
 * This file is a CONTRACT — it documents the shape and behavior the
 * implementation MUST satisfy. The implementation lives at
 * `packages/features/src/shared/vehicle-brand-logos/get-brand-logo-url.ts`.
 *
 * Test coverage: `packages/features/src/shared/vehicle-brand-logos/get-brand-logo-url.test.ts`
 */

/**
 * Input: any string the platform might have stored in `vehicles.brand`,
 * including null/undefined for absent values.
 *
 * Output: a URL string pointing at the bundled logo, or null if no logo
 * applies.
 */
export type GetBrandLogoUrl = (brand: string | null | undefined) => string | null;

/**
 * Behavior contract — every assertion below MUST hold for the implementation.
 *
 * B1 (known canonical):
 *   getBrandLogoUrl("Nissan") → typeof string (the Nissan URL)
 *
 * B2 (case-insensitive):
 *   getBrandLogoUrl("NISSAN") === getBrandLogoUrl("Nissan")
 *
 * B3 (whitespace trim):
 *   getBrandLogoUrl("  Nissan  ") === getBrandLogoUrl("Nissan")
 *
 * B4 (diacritic strip):
 *   getBrandLogoUrl("Séat") === getBrandLogoUrl("SEAT")
 *
 * B5 (unknown brand):
 *   getBrandLogoUrl("Made-Up Brand") === null
 *
 * B6 (empty / nullish):
 *   getBrandLogoUrl(null)       === null
 *   getBrandLogoUrl(undefined)  === null
 *   getBrandLogoUrl("")         === null
 *   getBrandLogoUrl("   ")      === null
 *
 * B7 (stable identity):
 *   getBrandLogoUrl("Nissan") === getBrandLogoUrl("Nissan")
 *
 * B8 (no I/O):
 *   The function MUST NOT issue any fetch/XHR. The normalized index is built
 *   once at module load. (Asserted by Playwright network-listener test.)
 *
 * B9 (normalization parity with brand picker):
 *   The normalization function used internally MUST be the SAME
 *   `normalizeForSearch` from `@ramcar/features/shared/vehicle-brand-model`
 *   so that a string accepted by the brand picker resolves to the same logo
 *   when rendered post-save.
 */
