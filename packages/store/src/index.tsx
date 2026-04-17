"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { createStore as createZustandStore, useStore, type StoreApi } from "zustand";
import { createAuthSlice, type AuthSlice } from "./slices/auth-slice";
import { createSidebarSlice, type SidebarSlice } from "./slices/sidebar-slice";
import { createThemeSlice, type ThemeSlice } from "./slices/theme-slice";
import { createSyncSlice, type SyncSlice } from "./slices/sync-slice";
import { createVisitorsSlice, type VisitorsSlice } from "./slices/visitors-slice";

export type { AuthSlice } from "./slices/auth-slice";
export type { SidebarSlice } from "./slices/sidebar-slice";
export type { ThemeSlice, Theme } from "./slices/theme-slice";
export type { SyncSlice, SyncStatus } from "./slices/sync-slice";
export type { VisitorsSlice, VisitorsSidebarMode } from "./slices/visitors-slice";

export interface AppState extends AuthSlice, SidebarSlice, ThemeSlice, SyncSlice, VisitorsSlice {}

export const createStore = () => {
  return createZustandStore<AppState>()((...args) => ({
    ...createAuthSlice(...args),
    ...createSidebarSlice(...args),
    ...createThemeSlice(...args),
    ...createSyncSlice(...args),
    ...createVisitorsSlice(...args),
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
