"use client";

import React, { useState, useRef, useCallback, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface AccordionItem {
  id: string;
  trigger: string;
  content: string;
}

interface AccordionProps {
  items: AccordionItem[];
}

export function Accordion({ items }: AccordionProps): React.JSX.Element {
  const [openId, setOpenId] = useState<string | null>(null);
  const triggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const toggle = useCallback(
    (id: string) => setOpenId((prev) => (prev === id ? null : id)),
    [],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
      let targetIndex: number | null = null;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          targetIndex = (index + 1) % items.length;
          break;
        case "ArrowUp":
          e.preventDefault();
          targetIndex = (index - 1 + items.length) % items.length;
          break;
        case "Home":
          e.preventDefault();
          targetIndex = 0;
          break;
        case "End":
          e.preventDefault();
          targetIndex = items.length - 1;
          break;
      }

      if (targetIndex !== null) {
        const targetId = items[targetIndex].id;
        triggerRefs.current.get(targetId)?.focus();
      }
    },
    [items],
  );

  return (
    <div className="divide-y divide-stone-200 border-t border-stone-200">
      {items.map((item, index) => {
        const isOpen = openId === item.id;
        const triggerId = `accordion-trigger-${item.id}`;
        const panelId = `accordion-panel-${item.id}`;

        return (
          <div key={item.id}>
            <button
              id={triggerId}
              ref={(el) => {
                if (el) triggerRefs.current.set(item.id, el);
              }}
              type="button"
              className="flex w-full items-center justify-between py-4 text-left font-semibold text-stone-900 cursor-pointer hover:text-teal-700 transition-colors duration-150"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(item.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              <span className="pr-4">{item.trigger}</span>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="shrink-0 text-stone-400"
              >
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(<ChevronDown className="h-5 w-5" />) as any}
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={triggerId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(<p className="pb-4 text-stone-600 leading-relaxed">
                    {item.content}
                  </p>) as any}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
