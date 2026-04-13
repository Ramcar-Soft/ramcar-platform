import type { StateCreator } from "zustand";

export type SyncStatus = "idle" | "syncing" | "error" | "offline";

export interface SyncSlice {
  syncStatus: SyncStatus;
  pendingCount: number;
  setSyncStatus: (status: SyncStatus) => void;
  setPendingCount: (count: number) => void;
  updateSync: (status: SyncStatus, pendingCount: number) => void;
}

export const createSyncSlice: StateCreator<SyncSlice, [], [], SyncSlice> = (set) => ({
  syncStatus: "idle",
  pendingCount: 0,
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  updateSync: (syncStatus, pendingCount) => set({ syncStatus, pendingCount }),
});
