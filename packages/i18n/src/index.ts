export { LOCALES, DEFAULT_LOCALE, LOCALE_LABELS } from "./locales";
export type { Locale } from "./locales";

import es from "./messages/es.json";
import en from "./messages/en.json";

export const messages = { es, en } as const;

export type Messages = typeof es;
