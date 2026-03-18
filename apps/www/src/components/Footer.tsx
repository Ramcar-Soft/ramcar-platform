"use client";

import React, { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";

import { usePathname, useRouter } from "@/i18n/routing";

const FOOTER_LINKS = [
  { key: "privacy", href: "#" },
  { key: "terms", href: "#" },
  { key: "contact", href: "#" },
] as const;

export default function Footer(): React.JSX.Element {
  const t = useTranslations("footer");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = useCallback(
    (target: "es-MX" | "en-US") => {
      if (target !== locale) {
        router.replace(pathname, { locale: target });
      }
    },
    [locale, pathname, router],
  );

  return (
    <footer className="bg-stone-900 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top row */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Left — Brand */}
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="font-bold text-white text-lg">RamcarSoft</span>
            <span className="text-stone-400 text-sm">{t("tagline")}</span>
          </div>

          {/* Center — Nav links */}
          <nav aria-label="Footer navigation">
            <div className="flex gap-6">
              {FOOTER_LINKS.map(({ key, href }) => (
                <a
                  key={key}
                  href={href}
                  className="text-stone-400 hover:text-white text-sm transition-colors duration-200"
                >
                  {t(`links.${key}`)}
                </a>
              ))}
            </div>
          </nav>

          {/* Right — Language switcher */}
          <div aria-live="polite" className="flex items-center gap-1 text-sm">
            <button
              onClick={() => switchLocale("es-MX")}
              className={[
                "transition-colors duration-200 cursor-pointer",
                locale === "es-MX"
                  ? "text-white font-semibold"
                  : "text-stone-500 hover:text-stone-300",
              ].join(" ")}
              aria-pressed={locale === "es-MX"}
            >
              {t("langSwitch.es")}
            </button>
            <span className="text-stone-600 select-none">|</span>
            <button
              onClick={() => switchLocale("en-US")}
              className={[
                "transition-colors duration-200 cursor-pointer",
                locale === "en-US"
                  ? "text-white font-semibold"
                  : "text-stone-500 hover:text-stone-300",
              ].join(" ")}
              aria-pressed={locale === "en-US"}
            >
              {t("langSwitch.en")}
            </button>
          </div>
        </div>

        {/* Bottom — Copyright */}
        <p className="text-stone-500 text-xs mt-8 pt-8 border-t border-stone-800 text-center">
          {t("copyright")}
        </p>
      </div>
    </footer>
  );
}
