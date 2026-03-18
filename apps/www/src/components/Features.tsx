"use client";

import React from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { AnimatedSection } from "./ui/AnimatedSection";
import { Tabs } from "./ui/Tabs";

function FeatureList({ items }: { items: string[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
      {items.map((item, index) => (
        <div key={index} className="flex flex-row gap-3 items-start py-2">
          <Check className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
          <span className="text-stone-700">{item}</span>
        </div>
      ))}
    </div>
  );
}

export default function Features() {
  const t = useTranslations("features");

  const adminItems = Array.from({ length: 6 }, (_, i) =>
    t(`tabs.admin.items.${i + 1}`)
  );
  const guardItems = Array.from({ length: 5 }, (_, i) =>
    t(`tabs.guard.items.${i + 1}`)
  );
  const residentItems = Array.from({ length: 5 }, (_, i) =>
    t(`tabs.resident.items.${i + 1}`)
  );

  const tabs = [
    {
      id: "admin",
      label: t("tabs.admin.label"),
      content: <FeatureList items={adminItems} />,
    },
    {
      id: "guard",
      label: t("tabs.guard.label"),
      content: <FeatureList items={guardItems} />,
    },
    {
      id: "resident",
      label: t("tabs.resident.label"),
      content: <FeatureList items={residentItems} />,
    },
  ];

  return (
    <AnimatedSection>
      <section id="features" className="bg-stone-50 py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4">
          {/* Headline */}
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-4xl font-bold text-stone-900">
              {t("headline")}
            </h2>
            <div className="w-16 h-1 bg-teal-500 mx-auto mt-3 rounded-full" />
          </div>

          {/* Tabs */}
          <Tabs tabs={tabs} />
        </div>
      </section>
    </AnimatedSection>
  );
}
