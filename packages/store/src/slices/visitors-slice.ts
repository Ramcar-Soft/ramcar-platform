import type { StateCreator } from "zustand";

export type VisitorsSidebarMode = "view" | "create" | "edit";

export interface VisitorsSlice {
  visitorsSidebarMode: VisitorsSidebarMode;
  selectedVisitPersonId: string | null;
  visitorsActiveTab: string;
  setVisitorsSidebarMode: (mode: VisitorsSidebarMode) => void;
  setSelectedVisitPersonId: (id: string | null) => void;
  setVisitorsActiveTab: (tab: string) => void;
  openVisitorsSidebar: (mode: VisitorsSidebarMode, id?: string | null) => void;
  closeVisitorsSidebar: () => void;
}

export const createVisitorsSlice: StateCreator<VisitorsSlice, [], [], VisitorsSlice> = (set) => ({
  visitorsSidebarMode: "view",
  selectedVisitPersonId: null,
  visitorsActiveTab: "details",
  setVisitorsSidebarMode: (mode) => set({ visitorsSidebarMode: mode }),
  setSelectedVisitPersonId: (id) => set({ selectedVisitPersonId: id }),
  setVisitorsActiveTab: (tab) => set({ visitorsActiveTab: tab }),
  openVisitorsSidebar: (mode, id = null) =>
    set({ visitorsSidebarMode: mode, selectedVisitPersonId: id ?? null }),
  closeVisitorsSidebar: () =>
    set({ visitorsSidebarMode: "view", selectedVisitPersonId: null }),
});
