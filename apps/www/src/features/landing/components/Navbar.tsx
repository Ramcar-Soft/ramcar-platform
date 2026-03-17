"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { key: "features", href: "features" },
  { key: "pricing", href: "pricing" },
  { key: "faq", href: "faq" },
] as const;

export default function Navbar() {
  const t = useTranslations("nav");
  const [mobileOpen, setMobileOpen] = useState(false);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  }

  return (
    <header className="bg-white/80 sticky top-0 z-50 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <span className="text-charcoal-blue text-xl font-bold">{t("logo")}</span>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map(({ key, href }) => (
            <button
              key={key}
              onClick={() => scrollTo(href)}
              className="text-charcoal-blue hover:text-light-green text-sm font-medium transition-colors"
            >
              {t(`links.${key}`)}
            </button>
          ))}
          <button
            onClick={() => scrollTo("contact")}
            className="bg-light-green hover:bg-baltic-blue rounded-lg px-5 py-2 text-sm font-semibold text-white shadow transition-colors"
          >
            {t("cta")}
          </button>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          className="text-charcoal-blue md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <nav className="bg-white/95 flex flex-col gap-4 px-4 pb-6 backdrop-blur md:hidden">
          {NAV_LINKS.map(({ key, href }) => (
            <button
              key={key}
              onClick={() => scrollTo(href)}
              className="text-charcoal-blue hover:text-light-green text-left text-base font-medium transition-colors"
            >
              {t(`links.${key}`)}
            </button>
          ))}
          <button
            onClick={() => scrollTo("contact")}
            className="bg-light-green hover:bg-baltic-blue rounded-lg px-5 py-2.5 text-base font-semibold text-white shadow transition-colors"
          >
            {t("cta")}
          </button>
        </nav>
      )}
    </header>
  );
}
