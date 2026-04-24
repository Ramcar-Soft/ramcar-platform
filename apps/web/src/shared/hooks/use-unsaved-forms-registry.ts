"use client";

import { useEffect } from "react";
import { create } from "zustand";

interface UnsavedFormsState {
  dirtyFormIds: Set<string>;
  register: (id: string) => void;
  deregister: (id: string) => void;
  hasAny: () => boolean;
  reset: () => void;
}

export const useUnsavedFormsStore = create<UnsavedFormsState>((set, get) => ({
  dirtyFormIds: new Set<string>(),
  register: (id) =>
    set((s) => ({ dirtyFormIds: new Set([...s.dirtyFormIds, id]) })),
  deregister: (id) =>
    set((s) => {
      const next = new Set(s.dirtyFormIds);
      next.delete(id);
      return { dirtyFormIds: next };
    }),
  hasAny: () => get().dirtyFormIds.size > 0,
  reset: () => set({ dirtyFormIds: new Set() }),
}));

export function useRegisterUnsavedForm(id: string, isDirty: boolean): void {
  const register = useUnsavedFormsStore((s) => s.register);
  const deregister = useUnsavedFormsStore((s) => s.deregister);

  useEffect(() => {
    if (isDirty) {
      register(id);
    } else {
      deregister(id);
    }
    return () => deregister(id);
  }, [id, isDirty, register, deregister]);
}
