/**
 * UI contract — VehicleBrandSelect
 *
 * Shared React component that exposes a fuzzy autocomplete over the curated
 * Mexico-market vehicle brand dataset. Lives in `@ramcar/features` and is
 * consumed by both `apps/web` and `apps/desktop`.
 *
 * This file is a contract specification — the actual implementation lives at
 *   packages/features/src/shared/vehicle-brand-model/vehicle-brand-select.tsx
 * Tests and the shared `VehicleForm` integration depend on this exact shape.
 */

export interface VehicleBrandSelectProps {
  /**
   * Currently committed brand value. `null` when nothing has been chosen yet.
   * Receives either a canonical dataset spelling (e.g. "Nissan") or the user's
   * free-text fallback (e.g. "Gumpert"). Consumers SHOULD NOT normalize this
   * value — the dataset canonical is the persisted form and the free-text
   * fallback is the user's verbatim input.
   */
  value: string | null;

  /**
   * Fires exactly once per commit (dataset pick, free-text fallback pick, or
   * explicit clear). Consumers MUST treat `null` as "user cleared the field"
   * and clear the dependent model field accordingly (FR-013, FR-014).
   *
   * Does NOT fire on every keystroke. Typing mid-text does not emit onChange.
   */
  onChange: (brand: string | null) => void;

  /**
   * Placeholder shown in the input when `value === null`. Defaults to the
   * i18n key `vehicles.brand.placeholder` via the injected i18n port.
   */
  placeholder?: string;

  /**
   * Disables the input entirely (e.g., form is submitting). Distinct from
   * the model input's "brand must be selected first" disablement, which is
   * a prop on `VehicleModelSelect`.
   */
  disabled?: boolean;

  /** `aria-label` override. Defaults to i18n `vehicles.brand.ariaLabel`. */
  ariaLabel?: string;

  /** DOM id for the underlying input (label association). */
  id?: string;
}

/**
 * Behavior contract (tests assert these):
 *
 * B1. Typing "nis" opens a suggestion list with "Nissan" at the top.
 * B2. Typing with diacritics ("peugeót") matches "Peugeot".
 * B3. Typing a query with no dataset match surfaces a
 *     "Use '<query>' as brand" row (free-text fallback — FR-007).
 * B4. Selecting a dataset row fires `onChange(<canonical spelling>)`.
 * B5. Selecting the free-text fallback fires `onChange(<trimmed user input>)`.
 * B6. Pressing ArrowUp / ArrowDown moves focus between suggestions (FR-015).
 * B7. Pressing Enter commits the focused suggestion.
 * B8. Pressing Escape closes the list without committing (FR-015).
 * B9. Emptying the input fires `onChange(null)` (FR-014).
 * B10. Suggestion rendering completes in <50 ms for the full dataset on a
 *      reviewer laptop (SC-003 — asserted by microbenchmark, not unit test).
 * B11. The component never issues a network request; the dataset is an
 *      in-module import (SC-004).
 */
