import type { StateCreator } from "zustand";

const STORAGE_KEY = "ramcar-sidebar-collapsed";

export interface SidebarSlice {
  collapsed: boolean;
  currentPath: string;
  toggleCollapsed: () => void;
  navigate: (path: string) => void;
}

function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export const createSidebarSlice: StateCreator<SidebarSlice, [], [], SidebarSlice> = (set) => ({
  collapsed: readCollapsed(),
  currentPath: "/dashboard",
  toggleCollapsed: () =>
    set((state) => {
      const next = !state.collapsed;
      localStorage.setItem(STORAGE_KEY, String(next));
      return { collapsed: next };
    }),
  navigate: (path) => set({ currentPath: path }),
});
