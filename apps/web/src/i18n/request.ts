import { getRequestConfig } from "next-intl/server";
import { messages } from "@ramcar/i18n";
import type { Locale } from "@ramcar/i18n";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as "es" | "en")) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: messages[locale as Locale],
  };
});
