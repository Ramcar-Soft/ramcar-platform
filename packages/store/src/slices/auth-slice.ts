import type { StateCreator } from "zustand";
import type { UserProfile } from "@ramcar/shared";

export interface AuthSlice {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: UserProfile) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
}

export const createAuthSlice: StateCreator<AuthSlice, [], [], AuthSlice> = (set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  clearAuth: () => set({ user: null, isAuthenticated: false, isLoading: false }),
});
