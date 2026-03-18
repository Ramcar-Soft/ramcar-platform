"use client";

import React, { useEffect, useRef } from "react";
import {
  useMotionValue,
  useTransform,
  animate,
  useInView,
  motion,
} from "framer-motion";

interface CountUpProps {
  target: number;
  suffix?: string;
  duration?: number;
}

const formatter = new Intl.NumberFormat("en-US");

export function CountUp({ target, suffix = "", duration = 2 }: CountUpProps): React.JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => formatter.format(Math.round(v)));

  useEffect(() => {
    if (!isInView) return;

    const controls = animate(motionValue, target, {
      duration,
      ease: "easeOut",
    });

    return () => controls.stop();
  }, [isInView, motionValue, target, duration]);

  return (
    <span ref={ref} className="font-mono text-4xl md:text-5xl font-bold text-teal-400">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <motion.span>{rounded as any}</motion.span>
      {suffix && <span>{suffix}</span>}
    </span>
  );
}
