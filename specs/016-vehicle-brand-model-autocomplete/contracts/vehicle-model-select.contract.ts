/**
 * UI contract — VehicleModelSelect
 *
 * Model autocomplete scoped to a parent-selected brand. Disabled while
 * `brand === null`. Search is `startsWith` / `includes` over the brand's
 * model list (NOT fuzzy — per spec FR-005).
 *
 * Actual implementation:
 *   packages/features/src/shared/vehicle-brand-model/vehicle-model-select.tsx
 */

export interface VehicleModelSelectProps {
  /**
   * The currently committed brand. Drives two things:
   *   1. Whether the input is enabled. `null` → disabled (FR-003).
   *   2. Which models are suggested. If `brand` is a dataset key, suggestions
   *      come from `VEHICLE_BRAND_MODEL[brand]`. If `brand` is a free-text
   *      fallback value (not a dataset key), no dataset suggestions are
   *      offered — only the free-text fallback row (FR-008).
   *
   * When this prop changes to a DIFFERENT non-null value, consumers are
   * expected to reset `value` to `null` (FR-013). This component does not
   * internally reset on brand change because the parent form owns the state.
   */
  brand: string | null;

  /** Currently committed model value (canonical dataset spelling or free-text). */
  value: string | null;

  /**
   * Fires on commit (dataset pick, free-text fallback, or explicit clear).
   * Does NOT fire on every keystroke.
   */
  onChange: (model: string | null) => void;

  placeholder?: string;

  /**
   * Additional disablement beyond "brand is null." Useful when the form is
   * submitting. "Brand-null" disablement is handled internally from the
   * `brand` prop and does not require setting this.
   */
  disabled?: boolean;

  ariaLabel?: string;

  id?: string;
}

/**
 * Behavior contract:
 *
 * M1. With `brand === null`, the input is disabled and does not open a
 *     suggestion list on focus. A tooltip / aria-describedby exposes the
 *     i18n string `vehicles.model.disabled` ("Pick a brand first").
 * M2. With `brand === "Nissan"`, typing "ver" shows "Versa" and "Versa Note"
 *     (startsWith-rank first, includes-rank second — FR-005).
 * M3. With `brand === "Nissan"`, the list never shows models from other
 *     brands, even when the typed query matches them (no cross-brand leaks).
 * M4. With `brand === "Gumpert"` (free-text fallback — NOT a dataset key),
 *     the suggestion list contains ONLY the free-text fallback row
 *     (`Use "<query>" as model`). No dataset entries are offered.
 * M5. Free-text fallback behaves identically to `VehicleBrandSelect` in
 *     keyboard/commit semantics.
 * M6. Suggestion rendering completes in <50 ms on a reviewer laptop.
 * M7. Case / accent normalization matches the brand component's contract.
 * M8. No network requests.
 *
 * Edge-case E-M1: When the parent sets `brand` to a new non-null value while
 * `value !== null`, the parent MUST also call `onChange(null)` to clear the
 * model. This component does not auto-clear because it does not hold the
 * state. A test in `vehicle-form.test.tsx` (parent) asserts this wiring.
 */
