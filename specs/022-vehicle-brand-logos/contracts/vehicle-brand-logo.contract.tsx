/**
 * Contract: <VehicleBrandLogo />
 *
 * The single shared component that renders a brand logo at icon scale,
 * resolving the URL via getBrandLogoUrl() and falling back to a fixed-size
 * neutral placeholder for unknown brands.
 *
 * Used by:
 *   - VehicleBrandSelect (autocomplete suggestion rows AND committed-value trigger)
 *   - vehicle-form-related list cells (vehicle-manage-list, visit-person-access-event-form)
 *   - logbook columns (web): visitors-columns, providers-columns, residents-columns
 *   - resident vehicle profiles, visitor profiles, vehicle detail surfaces
 *
 * Implementation: `packages/features/src/shared/vehicle-brand-logos/vehicle-brand-logo.tsx`
 * Tests: `packages/features/src/shared/vehicle-brand-logos/vehicle-brand-logo.test.tsx`
 */

export type VehicleBrandLogoSize = "sm" | "md";

export interface VehicleBrandLogoProps {
  /** The stored brand string. Lookup is normalized (case/diacritic/whitespace insensitive). */
  brand: string | null | undefined;
  /** Visual size — "sm" (16x16) for autocomplete & inline cells, "md" (24x24) for committed-value chips & detail headers. */
  size?: VehicleBrandLogoSize;
  /**
   * Optional className appended to the outer tile. The component still owns the
   * dimension classes; consumers may add margin/positioning helpers but MUST
   * NOT override width/height.
   */
  className?: string;
}

/**
 * Behavioral contract — every assertion MUST hold.
 *
 * V1 (known brand renders <img>):
 *   <VehicleBrandLogo brand="Nissan" /> renders an <img> with the resolved URL,
 *   width and height pinned to the size box, alt="" and aria-hidden="true"
 *   (the brand text alongside is the accessible label).
 *
 * V2 (unknown brand renders placeholder):
 *   <VehicleBrandLogo brand="Made-Up Brand" /> renders a <span> with role="presentation"
 *   occupying the same dimensions as V1, with class names that produce a near-
 *   invisible neutral tile. NO <img> is emitted (so the browser cannot 404).
 *
 * V3 (null/undefined/empty brand renders placeholder):
 *   <VehicleBrandLogo brand={null} />, brand={undefined}, brand="", brand="   "
 *   all render the same placeholder as V2.
 *
 * V4 (no layout shift):
 *   The outer element's computed width and height are EXACTLY:
 *     - size="sm" → 16 x 16 px (CSS: w-4 h-4 + flex-none)
 *     - size="md" → 24 x 24 px (CSS: w-6 h-6 + flex-none)
 *   in BOTH the known-brand and unknown-brand cases. Asserted by visual snapshot.
 *
 * V5 (theme tile):
 *   The outer element renders a near-white rounded tile (bg-white in light, bg-zinc-100
 *   in dark) so colored brand marks remain legible on dark surfaces.
 *
 * V6 (no broken-image visible):
 *   For unknown brands, NO <img> tag is rendered. The browser cannot emit a 404
 *   or a broken-image icon. This is asserted by a JSDOM unit test (count of <img>
 *   tags is zero for unknown brands) and a Playwright console-error assertion.
 *
 * V7 (default size):
 *   Omitting the size prop defaults to "sm".
 *
 * V8 (className composition):
 *   When className is provided, the outer tile's className includes both the
 *   base classes (size, tile bg, rounded) and the consumer's classes. The
 *   consumer-supplied className MUST NOT override the size-pinning classes
 *   (consumers wanting a different size pass `size="md"` instead).
 *
 * V9 (no fetch on render):
 *   Mounting the component issues zero fetch/XHR. The URL is a build-time
 *   static asset URL. (Asserted by network-listener test.)
 *
 * V10 (memoizable):
 *   The component must be a pure render of (brand, size, className). No
 *   internal state, no effects. Re-rendering with the same props produces
 *   identical DOM.
 */

/**
 * Reference signature (pseudocode — implementation details belong to the impl file):
 *
 *   export function VehicleBrandLogo({ brand, size = "sm", className }: VehicleBrandLogoProps) {
 *     const url = getBrandLogoUrl(brand);
 *     const dim = size === "md" ? "w-6 h-6" : "w-4 h-4";
 *     const tile = "flex-none rounded bg-white dark:bg-zinc-100 inline-flex items-center justify-center";
 *     if (url) {
 *       return (
 *         <span aria-hidden="true" className={cn(tile, dim, className)}>
 *           <img src={url} alt="" className={cn(dim, "object-contain")} />
 *         </span>
 *       );
 *     }
 *     return <span role="presentation" aria-hidden="true" className={cn(tile, dim, "bg-muted/40", className)} />;
 *   }
 */
