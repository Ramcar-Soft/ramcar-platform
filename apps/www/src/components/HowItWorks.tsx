"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { AnimatedSection } from "./ui/AnimatedSection";
import { staggerContainer, fadeUp } from "@/lib/animations";

const STEP_NUMBERS = [1, 2, 3, 4] as const;

interface StepProps {
  number: number;
  title: string;
  body: string;
}

function StepCircle({ number }: { number: number }) {
  return (
    <div className="w-12 h-12 rounded-full bg-teal-700 text-white font-bold flex items-center justify-center text-lg shrink-0">
      {number}
    </div>
  );
}

function DesktopStep({ number, title, body }: StepProps) {
  return (
    <motion.div
      variants={fadeUp}
      className="flex flex-col items-center text-center max-w-[200px]"
    >
      <StepCircle number={number} />
      <p className="font-semibold text-stone-900 mt-3">{title}</p>
      <p className="text-stone-600 text-sm mt-1">{body}</p>
    </motion.div>
  );
}

function MobileStep({ number, title, body }: StepProps) {
  return (
    <motion.div variants={fadeUp} className="flex gap-4">
      <div className="flex flex-col items-center">
        <StepCircle number={number} />
        {number < 4 && (
          <div className="w-0.5 bg-stone-200 flex-1 mt-2 min-h-[40px]" />
        )}
      </div>
      <div className="pb-8">
        <p className="font-semibold text-stone-900">{title}</p>
        <p className="text-stone-600 text-sm mt-1">{body}</p>
      </div>
    </motion.div>
  );
}

export default function HowItWorks() {
  const t = useTranslations("howItWorks");

  const steps = STEP_NUMBERS.map((n) => ({
    number: n,
    title: t(`steps.${n}.title`),
    body: t(`steps.${n}.body`),
  }));

  return (
    <AnimatedSection>
      <section id="how-it-works" className="bg-white py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4">
          {/* Headline */}
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-4xl font-bold text-stone-900">
              {t("headline")}
            </h2>
            <div className="w-16 h-1 bg-teal-500 mx-auto mt-3 rounded-full" />
          </div>

          {/* Desktop layout: horizontal row with connectors */}
          <motion.div
            className="hidden lg:flex items-start justify-between max-w-5xl mx-auto px-4"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <DesktopStep
                  number={step.number}
                  title={step.title}
                  body={step.body}
                />
                {index < steps.length - 1 && (
                  <div className="h-0.5 bg-stone-200 flex-1 mt-6 mx-2" />
                )}
              </React.Fragment>
            ))}
          </motion.div>

          {/* Mobile layout: vertical with left-aligned connecting line */}
          <motion.div
            className="flex flex-col lg:hidden max-w-sm mx-auto"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {steps.map((step) => (
              <MobileStep
                key={step.number}
                number={step.number}
                title={step.title}
                body={step.body}
              />
            ))}
          </motion.div>
        </div>
      </section>
    </AnimatedSection>
  );
}
