"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { createStore as createZustandStore, useStore, type StoreApi } from "zustand";
import { createAuthSlice, type AuthSlice } from "./slices/auth-slice";

export type { AuthSlice } from "./slices/auth-slice";

export interface AppState extends AuthSlice {}

export const createStore = () => {
  return createZustandStore<AppState>()((...args) => ({
    ...createAuthSlice(...args),
  }));
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

export function useAppStore<T>(selector: (state: AppState) => T): T {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("useAppStore must be used within a StoreProvider");
  }
  return useStore(store, selector);
}
