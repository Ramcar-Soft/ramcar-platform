"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { createStore as createZustandStore, type StoreApi } from "zustand";

// Minimal store shape — slices will be added as features are built
export interface AppState {
  // placeholder
}

export const createStore = () => {
  return createZustandStore<AppState>()(() => ({}));
};

type AppStore = StoreApi<AppState>;

const StoreContext = createContext<AppStore | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore>(undefined);
  if (!storeRef.current) {
    storeRef.current = createStore();
  }
  return <StoreContext.Provider value={storeRef.current}>{children}</StoreContext.Provider>;
}

export function useAppStore() {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("useAppStore must be used within a StoreProvider");
  }
  return store;
}
