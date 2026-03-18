"use client";

import React from "react";
import { motion } from "framer-motion";

interface ButtonProps {
  variant?: "primary" | "secondary";
  children: React.ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  "aria-label"?: string;
}

const springTransition = { type: "spring" as const, stiffness: 400, damping: 25 };

const variantStyles = {
  primary: [
    "bg-gradient-to-r from-amber-400 to-amber-500",
    "text-stone-950 font-semibold",
    "rounded-lg px-6 py-3",
    "shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_12px_rgba(245,158,11,0.15)]",
    "hover:from-amber-500 hover:to-amber-600",
    "hover:shadow-[0_2px_4px_rgba(0,0,0,0.1),0_8px_24px_rgba(245,158,11,0.25)]",
    "active:shadow-[0_1px_2px_rgba(0,0,0,0.1)]",
    "transition-[background,box-shadow] duration-200",
  ].join(" "),
  secondary: [
    "border-2 border-teal-700 text-teal-700",
    "rounded-lg px-6 py-3",
    "font-semibold",
    "hover:bg-teal-50 hover:border-teal-600 hover:text-teal-600",
    "transition-colors duration-200",
  ].join(" "),
};

export function Button({
  variant = "primary",
  className = "",
  children,
  href,
  onClick,
  type = "button",
  disabled,
  "aria-label": ariaLabel,
}: ButtonProps): React.JSX.Element {
  const classes = `${variantStyles[variant]} inline-flex items-center justify-center gap-2 cursor-pointer ${className}`;

  if (href) {
    return (
      <motion.a
        href={href}
        className={classes}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        transition={springTransition}
        aria-label={ariaLabel}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {children as any}
      </motion.a>
    );
  }

  return (
    <motion.button
      type={type}
      className={classes}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      transition={springTransition}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {children as any}
    </motion.button>
  );
}
