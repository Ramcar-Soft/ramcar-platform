"use client";

import type { ReactNode } from "react";
import { useTranslations, useLocale } from "next-intl";
import { I18nProvider, type I18nPort } from "@ramcar/features/adapters";
import type { Locale } from "@ramcar/i18n";

function WebI18nProviderInner({ children }: { children: ReactNode }) {
  const tRaw = useTranslations();
  const locale = useLocale() as Locale;

  const port: I18nPort = {
    t: (key, values) =>
      values
        ? String(tRaw(key, values as Record<string, string | number>))
        : tRaw(key),
    locale,
  };

  return <I18nProvider value={port}>{children}</I18nProvider>;
}

export function WebI18nProvider({ children }: { children: ReactNode }) {
  return <WebI18nProviderInner>{children}</WebI18nProviderInner>;
}
