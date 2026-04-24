import type { StateCreator } from "zustand";
import type { UserProfile } from "@ramcar/shared";

const ACTIVE_TENANT_KEY = "ramcar.auth.activeTenantId";
const ACTIVE_TENANT_NAME_KEY = "ramcar.auth.activeTenantName";

function clearStoredTenantFromLocalStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACTIVE_TENANT_KEY);
  localStorage.removeItem(ACTIVE_TENANT_NAME_KEY);
}

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
  clearStoredTenant: () => void;
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
    clearStoredTenantFromLocalStorage();
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
      localStorage.setItem(ACTIVE_TENANT_NAME_KEY, name);
    }
    set({ activeTenantId: id, activeTenantName: name });
  },

  hydrateActiveTenant: (fallbackPrimary) => {
    const { tenantIds } = get();
    let stored: string | null = null;
    let storedName: string | null = null;
    if (typeof window !== "undefined") {
      stored = localStorage.getItem(ACTIVE_TENANT_KEY);
      storedName = localStorage.getItem(ACTIVE_TENANT_NAME_KEY);
    }

    let activeId = "";
    if (stored && tenantIds.includes(stored)) {
      activeId = stored;
    } else if (fallbackPrimary && tenantIds.includes(fallbackPrimary)) {
      activeId = fallbackPrimary;
    } else if (tenantIds.length > 0) {
      activeId = tenantIds[0]!;
    }

    // Only trust the stored name when it still corresponds to the selected id,
    // otherwise leave it empty so the UI can resolve it from the fetched tenant list.
    const activeName = activeId && activeId === stored && storedName ? storedName : "";

    // Persist the resolved id so a fresh tab starts from the same tenant.
    if (typeof window !== "undefined" && activeId) {
      localStorage.setItem(ACTIVE_TENANT_KEY, activeId);
      if (activeName) {
        localStorage.setItem(ACTIVE_TENANT_NAME_KEY, activeName);
      }
    }

    set({ activeTenantId: activeId, activeTenantName: activeName });
  },

  clearStoredTenant: () => {
    clearStoredTenantFromLocalStorage();
  },
});
