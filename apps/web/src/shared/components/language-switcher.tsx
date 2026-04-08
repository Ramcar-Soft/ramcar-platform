"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import React from "react";
import { LOCALES, LOCALE_LABELS } from "@ramcar/i18n";
import type { Locale } from "@ramcar/i18n";
import { Button } from "@ramcar/ui";

export function LanguageSwitcher(): React.JSX.Element {
  const t = useTranslations("languageSwitcher");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  const otherLocale = LOCALES.find((l) => l !== locale) as Locale;

  function handleSwitch() {
    router.replace(pathname, { locale: otherLocale });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSwitch}
      title={t("label")}
      className="text-xs font-medium"
    >
      {LOCALE_LABELS[otherLocale]}
    </Button>
  );
}
