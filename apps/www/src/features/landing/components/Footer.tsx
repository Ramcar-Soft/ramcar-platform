"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";

export default function Footer() {
  const t = useTranslations("footer");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function handleLanguageSwitch() {
    const nextLocale = locale === "es-MX" ? "en-US" : "es-MX";
    router.push(pathname, { locale: nextLocale });
  }

  const languageLabel = locale === "es-MX" ? "EN" : "ES";

  return (
    <footer className="bg-charcoal-blue py-12 text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 md:flex-row md:justify-between">
        {/* Logo & tagline */}
        <div className="text-center md:text-left">
          <span className="text-sky-reflection text-xl font-bold">RamcarSoft</span>
          <p className="text-frosted-mint/80 mt-1 text-sm">{t("tagline")}</p>
        </div>

        {/* Links */}
        <nav className="flex flex-wrap justify-center gap-6 text-sm">
          <a
            href="#"
            className="text-sky-reflection/70 hover:text-sky-reflection transition-colors"
          >
            {t("links.privacy")}
          </a>
          <a
            href="#"
            className="text-sky-reflection/70 hover:text-sky-reflection transition-colors"
          >
            {t("links.terms")}
          </a>
          <a
            href="#contact"
            className="text-sky-reflection/70 hover:text-sky-reflection transition-colors"
          >
            {t("links.contact")}
          </a>
        </nav>

        {/* Language switcher */}
        <button
          onClick={handleLanguageSwitch}
          className="border-frosted-mint/40 hover:bg-frosted-mint/20 rounded-md border px-4 py-2 text-sm transition-colors text-white font-bold"
        >
          {languageLabel}
        </button>
      </div>

      {/* Copyright */}
      <div className="text-frosted-mint/60 mt-8 text-center text-xs">
        {t("copyright")}
      </div>
    </footer>
  );
}
