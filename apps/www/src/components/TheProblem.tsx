"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { UserX, MessageSquareWarning, FileX, NotebookPen, EyeOff } from "lucide-react";

import { AnimatedSection } from "./ui/AnimatedSection";
import { staggerContainer, fadeUp } from "@/lib/animations";

const ICONS = [UserX, MessageSquareWarning, FileX, NotebookPen, EyeOff] as const;

interface PainCardProps {
  icon: React.ElementType;
  title: string;
  body: string;
}

function PainCard({ icon: Icon, title, body }: PainCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      className="bg-white rounded-xl border border-stone-200 p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300"
    >
      <Icon className="w-10 h-10 text-teal-500 mb-4" />
      <p className="font-semibold text-stone-900">{title}</p>
      <p className="text-stone-600 text-sm mt-2">{body}</p>
    </motion.div>
  );
}

export default function TheProblem() {
  const t = useTranslations("problem");

  return (
    <AnimatedSection>
      <section id="problem" className="bg-stone-50 py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4">
          {/* Headline */}
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-bold text-stone-900">
              {t("headline")}
            </h2>
            <div className="w-16 h-1 bg-teal-500 mx-auto mt-3 rounded-full" />
          </div>

          {/* First three cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            <PainCard
              icon={ICONS[0]}
              title={t("items.1.title")}
              body={t("items.1.body")}
            />
            <PainCard
              icon={ICONS[1]}
              title={t("items.2.title")}
              body={t("items.2.body")}
            />
            <PainCard
              icon={ICONS[2]}
              title={t("items.3.title")}
              body={t("items.3.body")}
            />
          </motion.div>

          {/* Last two cards — centered row */}
          <motion.div
            className="mt-6 flex flex-col md:flex-row justify-center gap-6 lg:max-w-[calc(66.666%+12px)] lg:mx-auto"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            <div className="flex-1 md:max-w-[calc(50%-12px)]">
              <PainCard
                icon={ICONS[3]}
                title={t("items.4.title")}
                body={t("items.4.body")}
              />
            </div>
            <div className="flex-1 md:max-w-[calc(50%-12px)]">
              <PainCard
                icon={ICONS[4]}
                title={t("items.5.title")}
                body={t("items.5.body")}
              />
            </div>
          </motion.div>
        </div>
      </section>
    </AnimatedSection>
  );
}
