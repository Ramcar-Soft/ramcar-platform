/**
 * UI contract — VehicleYearInput
 *
 * Thin wrapper around `<Input type="number" inputMode="numeric">` with
 * built-in min/max tied to the Zod schema bounds. Validation is handled
 * by the shared `createVehicleSchema` on submit; this component surfaces
 * the bounds on the input element for native browser UX (numeric keypad
 * on mobile, spinner controls on desktop).
 *
 * Actual implementation:
 *   packages/features/src/shared/vehicle-brand-model/vehicle-year-input.tsx
 */

export interface VehicleYearInputProps {
  /**
   * Currently committed year. `null` means the user hasn't entered one.
   * Year is optional (FR-011) — the form commits `null` cleanly when blank.
   */
  value: number | null;

  /**
   * Fires on every edit that results in a valid-type value:
   *   - Non-empty input that parses to an integer → `onChange(<integer>)`.
   *   - Empty input → `onChange(null)`.
   * Out-of-range values are still forwarded (the number is still a number).
   * Final range validation is the Zod schema's responsibility on submit.
   */
  onChange: (year: number | null) => void;

  /** Disables the input (e.g., form submitting). */
  disabled?: boolean;

  /** DOM id for label association. */
  id?: string;
}

/**
 * Behavior contract:
 *
 * Y1. Empty input → `value` is `null`. The form's persisted draft stores
 *     `null`, and on submit Zod sees `undefined` (optional) — VALID.
 * Y2. Typing "2019" → `onChange(2019)`.
 * Y3. Typing "abc" is blocked at the browser layer by `type="number"`;
 *     even if text arrives, the form's Zod schema rejects on submit.
 * Y4. Lower bound `1960` and upper bound `currentYear() + 1` are enforced
 *     by the shared Zod schema (`createVehicleSchema`), not by this input.
 * Y5. The input's visible `min` / `max` HTML attributes mirror the Zod
 *     bounds so the browser's spinner / mobile keypad hints are sensible.
 */
