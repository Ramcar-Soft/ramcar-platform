"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, Minus } from "lucide-react";
import { useTranslations } from "next-intl";

import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { Button } from "@/components/ui/Button";
import { fadeUp, staggerContainer } from "@/lib/animations";

type TierKey = "basic" | "standard" | "premium";
type FeatureKey =
  | "communities"
  | "residents"
  | "guards"
  | "amenity"
  | "export"
  | "priority";

const TIER_KEYS: TierKey[] = ["basic", "standard", "premium"];
const FEATURE_KEYS: FeatureKey[] = [
  "communities",
  "residents",
  "guards",
  "amenity",
  "export",
  "priority",
];

// Included booleans defined in component to avoid next-intl string coercion
const TIER_FEATURES: Record<TierKey, Record<FeatureKey, boolean>> = {
  basic: {
    communities: true,
    residents: true,
    guards: true,
    amenity: false,
    export: false,
    priority: false,
  },
  standard: {
    communities: true,
    residents: true,
    guards: true,
    amenity: true,
    export: true,
    priority: false,
  },
  premium: {
    communities: true,
    residents: true,
    guards: true,
    amenity: true,
    export: true,
    priority: true,
  },
};

export default function Pricing(): React.JSX.Element {
  const t = useTranslations("pricing");

  return (
    <section id="pricing" className="bg-stone-50 py-20 md:py-28">
      <AnimatedSection className="text-center mb-12 px-4">
        <h2 className="text-2xl md:text-4xl font-bold text-stone-900 inline-block relative">
          {t("headline")}
          <span
            className="absolute -bottom-1.5 left-0 right-0 h-1 rounded-full bg-teal-500"
            aria-hidden="true"
          />
        </h2>
      </AnimatedSection>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start max-w-5xl mx-auto px-4"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
      >
        {TIER_KEYS.map((tier) => {
          const isStandard = tier === "standard";

          return (
            <motion.div
              key={tier}
              variants={fadeUp}
              className={[
                "bg-white rounded-2xl shadow-lg p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
                isStandard
                  ? "scale-[1.02] md:scale-105 border-t-4 border-teal-500 relative"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {isStandard && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-stone-950 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                  {t("mostPopular")}
                </span>
              )}

              <p className="text-xl font-bold text-stone-900">
                {t(`tiers.${tier}.name`)}
              </p>

              <p className="text-3xl font-bold text-stone-900 mt-2">
                {t(`tiers.${tier}.price`)}
                <span className="text-stone-400 text-sm font-normal ml-0.5">
                  {t("perMonth")}
                </span>
              </p>

              <ul className="mt-6 space-y-3">
                {FEATURE_KEYS.map((feature) => {
                  const included = TIER_FEATURES[tier][feature];
                  return (
                    <li key={feature} className="flex items-center gap-2">
                      {included ? (
                        <Check
                          className="w-5 h-5 text-teal-500 shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <Minus
                          className="w-5 h-5 text-stone-300 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={
                          included
                            ? "text-stone-700 text-sm"
                            : "text-stone-400 text-sm line-through"
                        }
                      >
                        {t(`tiers.${tier}.features.${feature}.label`)}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <Button
                variant={isStandard ? "primary" : "secondary"}
                href="#cta"
                className="w-full mt-6"
              >
                {t(`tiers.${tier}.cta`)}
              </Button>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="text-center mt-8 px-4 space-y-2">
        <p className="text-stone-500 text-sm">{t("note")}</p>
        <a
          href="#cta"
          className="text-teal-600 hover:text-teal-700 text-sm font-medium transition-colors duration-200"
        >
          {t("customPlan")}
        </a>
      </div>
    </section>
  );
}
