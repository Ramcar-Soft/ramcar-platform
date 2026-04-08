import { useTranslation } from "react-i18next";
import { LOCALES, LOCALE_LABELS } from "@ramcar/i18n";
import type { Locale } from "@ramcar/i18n";
import { Button } from "@ramcar/ui";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const currentLocale = i18n.language as Locale;
  const otherLocale = LOCALES.find((l) => l !== currentLocale) as Locale;

  async function handleSwitch() {
    await i18n.changeLanguage(otherLocale);
    if (window.api?.setLanguage) {
      await window.api.setLanguage(otherLocale);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSwitch}
      title={t("languageSwitcher.label")}
      className="text-xs font-medium"
    >
      {LOCALE_LABELS[otherLocale]}
    </Button>
  );
}
