/**
 * Data contract — Vehicle Brand/Model dataset
 *
 * Shape and invariants for the static reference dataset that powers both
 * autocompletes. Actual module:
 *   packages/features/src/shared/vehicle-brand-model/data.ts
 */

export type VehicleBrandModelDataset = Readonly<Record<string, readonly string[]>>;

/**
 * Enforced invariants (verified by `data.test.ts`):
 *
 * I-D1  No duplicate brand keys (TypeScript + a runtime test).
 * I-D2  Every brand's model list is non-empty.
 * I-D3  Within a single brand, no duplicate model names after
 *       case-insensitive, diacritic-normalized comparison.
 * I-D4  Every brand and model name matches `^[\p{L}\p{N}][\p{L}\p{N} \-\.]*$/u`.
 *       Allows Unicode letters (e.g., Spanish accented vowels like "León")
 *       and digits; no leading/trailing whitespace, no empty strings, no
 *       punctuation other than space, hyphen, or period.
 * I-D5  Brand count is within a sanity band of 10–100 (tripwire against
 *       accidental bulk deletion).
 * I-D6  `Object.isFrozen(VEHICLE_BRAND_MODEL)` is `true`. Consumers must
 *       not mutate.
 *
 * Spelling policy:
 *   - Brand: manufacturer's Mexico-market marketing spelling ("Volkswagen",
 *     "Mercedes-Benz", "BMW"). Not abbreviated unless that IS the marketing
 *     name.
 *   - Model: manufacturer's Mexico-market marketing model name.
 *   - NO trim/variant suffixes (no "Jetta GLI", just "Jetta"). Trim-level
 *     granularity is an explicit non-goal (spec §Non-Goals).
 *
 * Mutation policy:
 *   - Additions: normal PR.
 *   - Removals: require sign-off because historical vehicle rows in the DB
 *     may still reference a removed model string (they render fine — the
 *     DB column is free-text — but their autocomplete round-trip breaks).
 */
