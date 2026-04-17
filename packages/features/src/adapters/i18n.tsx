import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "@ramcar/i18n";

export interface I18nPort {
  t(key: string, values?: Record<string, string | number>): string;
  locale: Locale;
}

const I18nContext = createContext<I18nPort | null>(null);

export function I18nProvider({
  value,
  children,
}: {
  value: I18nPort;
  children: ReactNode;
}) {
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nPort {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an <I18nProvider>");
  return ctx;
}
