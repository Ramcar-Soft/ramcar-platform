import type { StateCreator } from "zustand";
import type { UserProfile } from "@ramcar/shared";

const ACTIVE_TENANT_KEY = "ramcar.auth.activeTenantId";

export interface AuthSlice {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  tenantIds: string[];
  activeTenantId: string;
  activeTenantName: string;

  setUser: (user: UserProfile) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;

  setTenantIds: (ids: string[]) => void;
  setActiveTenant: (id: string, name: string) => void;
  hydrateActiveTenant: (fallbackPrimary: string) => void;
}

export const createAuthSlice: StateCreator<AuthSlice, [], [], AuthSlice> = (set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  tenantIds: [],
  activeTenantId: "",
  activeTenantName: "",

  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),

  clearAuth: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(ACTIVE_TENANT_KEY);
    }
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      tenantIds: [],
      activeTenantId: "",
      activeTenantName: "",
    });
  },

  setTenantIds: (ids) => set({ tenantIds: ids }),

  setActiveTenant: (id, name) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(ACTIVE_TENANT_KEY, id);
    }
    set({ activeTenantId: id, activeTenantName: name });
  },

  hydrateActiveTenant: (fallbackPrimary) => {
    const { tenantIds } = get();
    let stored: string | null = null;
    if (typeof window !== "undefined") {
      stored = localStorage.getItem(ACTIVE_TENANT_KEY);
    }

    let activeId = "";
    if (stored && tenantIds.includes(stored)) {
      activeId = stored;
    } else if (fallbackPrimary && tenantIds.includes(fallbackPrimary)) {
      activeId = fallbackPrimary;
    } else if (tenantIds.length > 0) {
      activeId = tenantIds[0]!;
    }

    set({ activeTenantId: activeId });
  },
});
