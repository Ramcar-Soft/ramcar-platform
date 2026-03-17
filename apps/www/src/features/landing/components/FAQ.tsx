"use client";

import { useTranslations } from "next-intl";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@ramcar/ui";

const FAQ_COUNT = 7;

export default function FAQ() {
  const t = useTranslations("faq");

  return (
    <section id="faq" className="relative overflow-hidden bg-white py-20">
      <div className="relative z-10 mx-auto max-w-3xl px-4">
        <div className="mb-14 text-center">
          <h2 className="text-charcoal-blue text-3xl font-bold tracking-tight sm:text-4xl">
            {t("headline")}
          </h2>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-3">
          {Array.from({ length: FAQ_COUNT }).map((_, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="rounded-xl border border-sky-reflection/30 bg-white/60 px-6 shadow-sm backdrop-blur"
            >
              <AccordionTrigger className="text-baltic-blue py-5 text-left text-lg font-semibold hover:no-underline">
                {t(`items.${i}.question`)}
              </AccordionTrigger>
              <AccordionContent className="text-charcoal-blue pb-5 text-sm leading-relaxed">
                {t(`items.${i}.answer`)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
