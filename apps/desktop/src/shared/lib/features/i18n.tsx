import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { I18nProvider, type I18nPort } from "@ramcar/features/adapters";
import type { Locale } from "@ramcar/i18n";

export function DesktopI18nProvider({ children }: { children: ReactNode }) {
  const { t: tRaw, i18n } = useTranslation();

  const port: I18nPort = {
    t: (key, values) => String(tRaw(key as never, values as never)),
    locale: i18n.language as Locale,
  };

  return <I18nProvider value={port}>{children}</I18nProvider>;
}
