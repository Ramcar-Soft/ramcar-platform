"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
}

export function Tabs({ tabs }: TabsProps): React.JSX.Element {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");

  const activeTab = tabs.find((t) => t.id === activeId);

  return (
    <div>
      {/* Tab bar */}
      <div
        role="tablist"
        className="relative flex border-b border-stone-200"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              className={`relative px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors duration-150 ${
                isActive
                  ? "text-teal-700"
                  : "text-stone-500 hover:text-stone-700"
              }`}
              onClick={() => setActiveId(tab.id)}
            >
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab panels */}
      <AnimatePresence mode="wait">
        {activeTab && (
          <motion.div
            key={activeTab.id}
            role="tabpanel"
            id={`tabpanel-${activeTab.id}`}
            aria-labelledby={`tab-${activeTab.id}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="pt-4"
          >
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {activeTab.content as any}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
