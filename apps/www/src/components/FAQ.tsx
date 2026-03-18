"use client";

import React from "react";
import { useTranslations } from "next-intl";

import { Accordion } from "@/components/ui/Accordion";
import { AnimatedSection } from "@/components/ui/AnimatedSection";

export default function FAQ(): React.JSX.Element {
  const t = useTranslations("faq");

  const items = Array.from({ length: 7 }, (_, i) => ({
    id: String(i + 1),
    trigger: t(`items.${i + 1}.question`),
    content: t(`items.${i + 1}.answer`),
  }));

  return (
    <section id="faq" className="bg-white py-20 md:py-28">
      <div className="max-w-3xl mx-auto px-4">
        <AnimatedSection className="text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-bold text-stone-900 inline-block relative">
            {t("headline")}
            <span
              className="absolute -bottom-1.5 left-0 right-0 h-1 rounded-full bg-teal-500"
              aria-hidden="true"
            />
          </h2>
        </AnimatedSection>

        <AnimatedSection delay={0.15}>
          <Accordion items={items} />
        </AnimatedSection>
      </div>
    </section>
  );
}
