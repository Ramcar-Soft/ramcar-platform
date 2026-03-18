"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { heroWordStagger, heroWord, fadeUp } from "@/lib/animations";

import { Button } from "./ui/Button";

export default function Hero() {
  const t = useTranslations("hero");

  const headlineWords = t("headline").split(" ");

  return (
    <section
      id="hero"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-400"
      style={{
        backgroundImage: [
          "linear-gradient(to bottom right, #0d9488, #14b8a6, #34d399)",
          "repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.05) 59px, rgba(255,255,255,0.05) 60px)",
          "repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,0.05) 59px, rgba(255,255,255,0.05) 60px)",
        ].join(", "),
      }}
    >
      {/* Floating shapes with slow drift animation */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes drift-1 {
              0% { transform: translate(0, 0) scale(1); }
              50% { transform: translate(40px, -30px) scale(1.05); }
              100% { transform: translate(0, 0) scale(1); }
            }
            @keyframes drift-2 {
              0% { transform: translate(0, 0) scale(1); }
              50% { transform: translate(-35px, 25px) scale(0.95); }
              100% { transform: translate(0, 0) scale(1); }
            }
            @keyframes drift-3 {
              0% { transform: translate(0, 0) scale(1.02); }
              50% { transform: translate(25px, 40px) scale(0.98); }
              100% { transform: translate(0, 0) scale(1.02); }
            }
          `,
        }}
      />

      {/* Floating shape 1 - top left */}
      <div
        className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl"
        style={{ animation: "drift-1 20s ease-in-out infinite" }}
        aria-hidden="true"
      />

      {/* Floating shape 2 - bottom right */}
      <div
        className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-emerald-300/15 blur-3xl"
        style={{ animation: "drift-2 24s ease-in-out infinite" }}
        aria-hidden="true"
      />

      {/* Floating shape 3 - center right */}
      <div
        className="pointer-events-none absolute right-1/4 top-1/3 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl"
        style={{ animation: "drift-3 22s ease-in-out infinite" }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center text-white">
        {/* Headline - word-by-word stagger */}
        <motion.h1
          className="text-3xl font-bold leading-tight md:text-5xl lg:text-6xl"
          variants={heroWordStagger}
          initial="hidden"
          animate="visible"
        >
          {headlineWords.map((word, i) => (
            <motion.span
              key={i}
              className="mr-[0.25em] inline-block"
              variants={heroWord}
            >
              {word}
            </motion.span>
          ))}
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="mx-auto mt-6 max-w-2xl text-lg text-white/80 md:text-xl"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.5 }}
        >
          {t("subheadline")}
        </motion.p>

        {/* CTA row */}
        <motion.div
          className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.7 }}
        >
          <Button variant="primary" href="#cta">
            {t("primaryCta")}
          </Button>
          <Button
            variant="secondary"
            href="#how-it-works"
            className="border-white/70 text-white hover:bg-white/10"
          >
            {t("secondaryCta")}
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
