"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_PREFIX = "ramcar-draft:";

interface StoredDraft<T> {
  data: T;
  savedAt: number;
}

interface UseFormPersistenceOptions<T> {
  onRestore: (draft: T) => void;
  excludeFields?: (keyof T)[];
  debounceMs?: number;
}

export function useFormPersistence<T extends Record<string, unknown>>(
  formKey: string,
  formData: T,
  options: UseFormPersistenceOptions<T>,
) {
  const { onRestore, excludeFields, debounceMs = 1000 } = options;
  const [wasRestored, setWasRestored] = useState(false);
  const storageKey = `${STORAGE_PREFIX}${formKey}`;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;
  const excludeFieldsRef = useRef(excludeFields);
  excludeFieldsRef.current = excludeFields;

  // Restore on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;

    try {
      const stored: StoredDraft<T> = JSON.parse(raw);
      onRestoreRef.current(stored.data);
      setWasRestored(true);
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  // Debounced save on change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (typeof window === "undefined") return;

    timerRef.current = setTimeout(() => {
      const dataToSave = { ...formData };
      const fields = excludeFieldsRef.current;

      if (fields) {
        for (const field of fields) {
          delete dataToSave[field];
        }
      }

      const stored: StoredDraft<T> = {
        data: dataToSave,
        savedAt: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(stored));
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [formData, storageKey, debounceMs]);

  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const discardDraft = useCallback(() => {
    clearDraft();
    setWasRestored(false);
  }, [clearDraft]);

  return { wasRestored, discardDraft, clearDraft };
}
