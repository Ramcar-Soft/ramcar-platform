import { useCallback, useEffect } from "react";

export interface UseKeyboardNavigationOptions<T> {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  disabled?: boolean;
  items?: T[];
  highlightedIndex?: number;
  setHighlightedIndex?: (i: number | ((prev: number) => number)) => void;
  onSelectItem?: (item: T) => void;
  onCreate?: () => void;
}

export function useKeyboardNavigation<T>({
  searchInputRef,
  disabled,
  items,
  highlightedIndex,
  setHighlightedIndex,
  onSelectItem,
  onCreate,
}: UseKeyboardNavigationOptions<T>): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (
        e.key === "b" ||
        e.key === "B" ||
        e.key === "f" ||
        e.key === "F"
      ) {
        if (!isInputFocused) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
        return;
      }

      if (e.key === "n" || e.key === "N") {
        if (!isInputFocused && onCreate) {
          e.preventDefault();
          onCreate();
        }
        return;
      }

      if (e.key === "ArrowDown" && setHighlightedIndex) {
        e.preventDefault();
        const max = (items?.length ?? 1) - 1;
        setHighlightedIndex((prev) => Math.min(prev + 1, max));
        return;
      }

      if (e.key === "ArrowUp" && setHighlightedIndex) {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (
        e.key === "Enter" &&
        onSelectItem &&
        items &&
        highlightedIndex !== undefined &&
        highlightedIndex >= 0
      ) {
        const item = items[highlightedIndex];
        if (item) {
          e.preventDefault();
          onSelectItem(item);
        }
      }

      if (e.key === "Escape" && isInputFocused) {
        (target as HTMLInputElement).blur();
      }
    },
    [
      disabled,
      searchInputRef,
      items,
      highlightedIndex,
      setHighlightedIndex,
      onSelectItem,
      onCreate,
    ],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
