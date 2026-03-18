"use client";

import React from "react";
import { useTranslations } from "next-intl";

import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { CountUp } from "@/components/ui/CountUp";

export default function SocialProof(): React.JSX.Element {
  const t = useTranslations("socialProof");

  const stats = [
    {
      value: parseInt(t("stats.1.value")),
      suffix: t("stats.1.suffix"),
      label: t("stats.1.label"),
    },
    {
      value: parseInt(t("stats.2.value")),
      suffix: t("stats.2.suffix"),
      label: t("stats.2.label"),
    },
    {
      value: parseInt(t("stats.3.value")),
      suffix: t("stats.3.suffix"),
      label: t("stats.3.label"),
    },
  ];

  return (
    <section
      id="social-proof"
      className="bg-stone-950 relative overflow-hidden py-20 md:py-28"
    >
      {/* Background accent: faint radial teal glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(20, 184, 166, 0.05) 0%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        <AnimatedSection>
          <h2 className="text-2xl md:text-4xl font-bold text-white">
            {t("headline")}
          </h2>
          <p className="text-stone-400 max-w-2xl mx-auto mt-4 leading-relaxed">
            {t("body")}
          </p>

          {/* Stats row */}
          <div className="flex flex-col md:flex-row gap-8 md:gap-16 justify-center mt-12">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <CountUp target={stat.value} suffix={stat.suffix} />
                <p className="text-stone-400 text-sm mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
