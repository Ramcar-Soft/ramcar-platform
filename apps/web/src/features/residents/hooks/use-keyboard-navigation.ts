"use client";

import { useEffect, useCallback } from "react";
import type { ExtendedUserProfile } from "@ramcar/shared";

interface UseKeyboardNavigationOptions {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  sidebarOpen: boolean;
  residents: ExtendedUserProfile[] | undefined;
  highlightedIndex: number;
  setHighlightedIndex: (index: number | ((prev: number) => number)) => void;
  onSelectResident: (resident: ExtendedUserProfile) => void;
}

export function useKeyboardNavigation({
  searchInputRef,
  sidebarOpen,
  residents,
  highlightedIndex,
  setHighlightedIndex,
  onSelectResident,
}: UseKeyboardNavigationOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (sidebarOpen) return;

      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (e.key === "b" || e.key === "B") {
        if (!isInputFocused) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const max = (residents?.length ?? 1) - 1;
        setHighlightedIndex((prev) => Math.min(prev + 1, max));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (e.key === "Enter" && highlightedIndex >= 0 && residents) {
        const resident = residents[highlightedIndex];
        if (resident) {
          e.preventDefault();
          onSelectResident(resident);
        }
      }

      if (e.key === "Escape" && isInputFocused) {
        (target as HTMLInputElement).blur();
      }
    },
    [sidebarOpen, searchInputRef, residents, highlightedIndex, setHighlightedIndex, onSelectResident],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
