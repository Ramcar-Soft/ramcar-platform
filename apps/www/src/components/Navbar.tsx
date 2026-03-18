"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { usePathname, useRouter } from "@/i18n/routing";

import { Button } from "./ui/Button";

const NAV_LINKS = [
  { key: "features", href: "#features" },
  { key: "pricing", href: "#pricing" },
  { key: "faq", href: "#faq" },
] as const;

const SIGN_IN_URL = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.ramcarsoft.com"}/login`;

export default function Navbar() {
  const t = useTranslations("nav");
  const tFooter = useTranslations("footer");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY >= 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Close drawer on Escape key
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const switchLocale = useCallback(
    (target: "es-MX" | "en-US") => {
      if (target !== locale) {
        router.replace(pathname, { locale: target });
      }
    },
    [locale, pathname, router],
  );

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const textColor = scrolled ? "text-stone-900" : "text-white";
  const logoColor = scrolled ? "text-teal-700" : "text-white";

  return (
    <nav
      className={[
        "fixed top-0 w-full z-50",
        "transition-all duration-300",
        scrolled
          ? "bg-white/95 backdrop-blur-lg shadow-sm"
          : "bg-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        {/* Left — Logo */}
        <a href="#" className={`text-xl font-bold ${logoColor} transition-colors duration-300`}>
          RamcarSoft
        </a>

        {/* Center — Desktop nav links */}
        <div className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map(({ key, href }) => (
            <a
              key={key}
              href={href}
              className={`text-sm font-medium ${textColor} hover:text-teal-500 transition-colors duration-200`}
            >
              {t(key)}
            </a>
          ))}
        </div>

        {/* Right — Desktop actions */}
        <div className="hidden lg:flex items-center gap-4">
          {/* Language toggle */}
          <div aria-live="polite" className="flex items-center gap-1 text-sm">
            <button
              onClick={() => switchLocale("es-MX")}
              className={[
                textColor,
                "transition-colors duration-200 cursor-pointer",
                locale === "es-MX" ? "font-semibold" : "opacity-60",
              ].join(" ")}
            >
              {tFooter("langSwitch.es")}
            </button>
            <span className={`${textColor} opacity-40`}>|</span>
            <button
              onClick={() => switchLocale("en-US")}
              className={[
                textColor,
                "transition-colors duration-200 cursor-pointer",
                locale === "en-US" ? "font-semibold" : "opacity-60",
              ].join(" ")}
            >
              {tFooter("langSwitch.en")}
            </button>
          </div>

          {/* Sign in */}
          <a
            href={SIGN_IN_URL}
            className={`text-sm font-medium ${textColor} hover:text-teal-500 transition-colors duration-200`}
          >
            {t("signIn")}
          </a>

          {/* Request demo */}
          <Button href="#cta" className="text-sm px-4 py-2">
            {t("requestDemo")}
          </Button>
        </div>

        {/* Mobile hamburger */}
        <button
          className={`lg:hidden ${textColor} transition-colors duration-300 cursor-pointer`}
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-stone-950/50 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeMobile}
              aria-hidden="true"
            />

            {/* Drawer */}
            <motion.div
              className="fixed top-0 right-0 h-full w-72 bg-white z-50 shadow-xl flex flex-col"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Close button */}
              <div className="flex justify-end p-4">
                <button
                  onClick={closeMobile}
                  aria-label="Close menu"
                  className="text-stone-900 cursor-pointer"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Nav links */}
              <div className="flex flex-col gap-2 px-6">
                {NAV_LINKS.map(({ key, href }) => (
                  <a
                    key={key}
                    href={href}
                    onClick={closeMobile}
                    className="text-stone-900 text-base font-medium py-2 hover:text-teal-600 transition-colors duration-200"
                  >
                    {t(key)}
                  </a>
                ))}
              </div>

              <hr className="mx-6 my-4 border-stone-200" />

              {/* Sign in */}
              <div className="px-6">
                <a
                  href={SIGN_IN_URL}
                  onClick={closeMobile}
                  className="text-stone-900 text-base font-medium py-2 block hover:text-teal-600 transition-colors duration-200"
                >
                  {t("signIn")}
                </a>
              </div>

              {/* Request demo */}
              <div className="px-6 mt-4">
                <Button href="#cta" className="w-full text-sm" onClick={closeMobile}>
                  {t("requestDemo")}
                </Button>
              </div>

              {/* Language switcher at bottom */}
              <div className="mt-auto px-6 pb-8" aria-live="polite">
                <div className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => {
                      switchLocale("es-MX");
                      closeMobile();
                    }}
                    className={[
                      "text-stone-900 transition-colors duration-200 cursor-pointer",
                      locale === "es-MX" ? "font-semibold" : "opacity-60",
                    ].join(" ")}
                  >
                    {tFooter("langSwitch.es")}
                  </button>
                  <span className="text-stone-400">|</span>
                  <button
                    onClick={() => {
                      switchLocale("en-US");
                      closeMobile();
                    }}
                    className={[
                      "text-stone-900 transition-colors duration-200 cursor-pointer",
                      locale === "en-US" ? "font-semibold" : "opacity-60",
                    ].join(" ")}
                  >
                    {tFooter("langSwitch.en")}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
