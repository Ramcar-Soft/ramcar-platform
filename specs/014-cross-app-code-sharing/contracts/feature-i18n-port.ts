/**
 * Contract: I18nPort
 *
 * Library-agnostic translation lookup for @ramcar/features.
 * Each host wires its concrete i18n library behind this contract:
 *   - apps/web      → next-intl's useTranslations()
 *   - apps/desktop  → react-i18next's useTranslation()
 *
 * FR-004, FR-005, FR-014 require the shared module to avoid committing to either library.
 *
 * Rules:
 *  - `t(key)` MUST return the key unchanged when missing (standard behavior of both libs).
 *  - Shared components MUST pass full dotted keys ("visitPersons.form.fullName"),
 *    never scope suffixes. Scoping is a host convenience.
 *  - `values` is optional; placeholders not matched remain untouched in the output.
 *  - The source of truth for strings remains @ramcar/i18n — this port is lookup-only.
 */

import type { Locale } from "@ramcar/i18n";

export interface I18nPort {
  /** Flat translation function. Full dotted keys. */
  t(key: string, values?: Record<string, string | number>): string;

  /** Current locale identifier. Re-renders shared consumers when it changes. */
  locale: Locale;
}

export interface UseI18n {
  (): I18nPort;
}
