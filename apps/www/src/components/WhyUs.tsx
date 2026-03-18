"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  WifiOff,
  Smartphone,
  FileSearch,
  Ban,
  CalendarDays,
  MapPin,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";

import { AnimatedSection } from "./ui/AnimatedSection";
import { staggerContainer, fadeUp } from "@/lib/animations";

const ICONS: LucideIcon[] = [
  WifiOff,
  Smartphone,
  FileSearch,
  Ban,
  CalendarDays,
  MapPin,
];

const ITEM_KEYS = [1, 2, 3, 4, 5, 6] as const;

interface WhyUsCardProps {
  icon: LucideIcon;
  title: string;
  body: string;
}

function WhyUsCard({ icon: Icon, title, body }: WhyUsCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      className="p-6 rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
    >
      <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-teal-600" />
      </div>
      <h3 className="font-semibold text-stone-900">{title}</h3>
      <p className="text-stone-600 text-sm mt-2">{body}</p>
    </motion.div>
  );
}

export default function WhyUs() {
  const t = useTranslations("whyUs");

  const items = ITEM_KEYS.map((key, index) => ({
    key,
    icon: ICONS[index],
    title: t(`items.${key}.title`),
    body: t(`items.${key}.body`),
  }));

  return (
    <AnimatedSection>
      <section id="why-us" className="bg-white py-20 md:py-28">
        {/* Headline */}
        <div className="text-center mb-12 px-4">
          <h2 className="text-2xl md:text-4xl font-bold text-stone-900">
            {t("headline")}
          </h2>
          <div className="w-16 h-1 bg-teal-500 mx-auto mt-3 rounded-full" />
        </div>

        {/* Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto px-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {items.map(({ key, icon, title, body }) => (
            <WhyUsCard key={key} icon={icon} title={title} body={body} />
          ))}
        </motion.div>
      </section>
    </AnimatedSection>
  );
}
