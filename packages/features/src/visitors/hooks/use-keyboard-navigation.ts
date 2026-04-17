import { useEffect, useCallback } from "react";
import type { VisitPerson } from "../types";

interface UseKeyboardNavigationOptions {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  sidebarOpen: boolean;
  persons: VisitPerson[] | undefined;
  highlightedIndex: number;
  setHighlightedIndex: (index: number | ((prev: number) => number)) => void;
  onSelectPerson: (person: VisitPerson) => void;
}

export function useKeyboardNavigation({
  searchInputRef,
  sidebarOpen,
  persons,
  highlightedIndex,
  setHighlightedIndex,
  onSelectPerson,
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
        const max = (persons?.length ?? 1) - 1;
        setHighlightedIndex((prev) => Math.min(prev + 1, max));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (e.key === "Enter" && highlightedIndex >= 0 && persons) {
        const person = persons[highlightedIndex];
        if (person) {
          e.preventDefault();
          onSelectPerson(person);
        }
      }

      if (e.key === "Escape" && isInputFocused) {
        (target as HTMLInputElement).blur();
      }
    },
    [sidebarOpen, searchInputRef, persons, highlightedIndex, setHighlightedIndex, onSelectPerson],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
