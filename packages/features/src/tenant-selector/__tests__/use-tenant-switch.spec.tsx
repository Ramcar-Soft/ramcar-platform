import React, { type ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthStoreProvider } from "../../adapters/tenant-selector-adapters";
import type { AuthStorePort } from "../../adapters/tenant-selector-adapters";
import { UnsavedChangesProvider } from "../../adapters/unsaved-changes";
import { AnalyticsProvider } from "../../adapters/analytics";
import { TransportProvider } from "../../adapters/transport";
import type { TransportPort } from "../../adapters/transport";
import { RoleProvider } from "../../adapters/role";
import { useTenantSwitch } from "../hooks/use-tenant-switch";

vi.mock("../hooks/use-tenant-list", () => ({
  useTenantList: () => ({
    data: [
      { id: "t1", name: "Los Robles", slug: "los-robles", status: "active", image_path: null },
      { id: "t2", name: "San Pedro", slug: "san-pedro", status: "active", image_path: null },
    ],
  }),
}));

const mockTransport: TransportPort = {
  get: async () => ({ data: [], meta: {} }) as never,
  post: async (_, d) => d as never,
  patch: async (_, d) => d as never,
  put: async (_, d) => d as never,
  delete: async () => undefined as never,
  upload: async () => ({}) as never,
};

function makeWrapper(authStore: AuthStorePort, hasUnsaved = false) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <TransportProvider value={mockTransport}>
          <RoleProvider value={{ role: "Admin", tenantId: "t1", userId: "u1" }}>
            <AuthStoreProvider value={authStore}>
              <UnsavedChangesProvider value={{ hasUnsavedChanges: () => hasUnsaved }}>
                <AnalyticsProvider value={{ track: vi.fn() }}>
                  {children}
                </AnalyticsProvider>
              </UnsavedChangesProvider>
            </AuthStoreProvider>
          </RoleProvider>
        </TransportProvider>
      </QueryClientProvider>
    );
  };
}

describe("useTenantSwitch", () => {
  let setActiveTenant: ReturnType<typeof vi.fn>;
  let authStore: AuthStorePort;

  beforeEach(() => {
    setActiveTenant = vi.fn();
    authStore = {
      tenantIds: ["t1", "t2"],
      activeTenantId: "t1",
      activeTenantName: "Los Robles",
      setActiveTenant,
    };
  });

  it("onSelect opens the dialog with correct props when target differs from active", () => {
    const { result } = renderHook(() => useTenantSwitch(), {
      wrapper: makeWrapper(authStore),
    });

    expect(result.current.dialogOpen).toBe(false);

    act(() => {
      result.current.onSelect("t2");
    });

    expect(result.current.dialogOpen).toBe(true);
    expect(result.current.targetId).toBe("t2");
    expect(result.current.targetName).toBe("San Pedro");
    expect(result.current.sourceTenantName).toBe("Los Robles");
  });

  it("onSelect is a no-op when targetId === activeTenantId", () => {
    const { result } = renderHook(() => useTenantSwitch(), {
      wrapper: makeWrapper(authStore),
    });

    act(() => {
      result.current.onSelect("t1");
    });

    expect(result.current.dialogOpen).toBe(false);
  });

  it("onCancel closes dialog without calling setActiveTenant", () => {
    const { result } = renderHook(() => useTenantSwitch(), {
      wrapper: makeWrapper(authStore),
    });

    act(() => {
      result.current.onSelect("t2");
    });
    expect(result.current.dialogOpen).toBe(true);

    act(() => {
      result.current.onCancel();
    });

    expect(result.current.dialogOpen).toBe(false);
    expect(setActiveTenant).not.toHaveBeenCalled();
  });

  it("onConfirm calls setActiveTenant and closes dialog", async () => {
    const { result } = renderHook(() => useTenantSwitch(), {
      wrapper: makeWrapper(authStore),
    });

    act(() => {
      result.current.onSelect("t2");
    });

    act(() => {
      result.current.onConfirm();
    });

    expect(setActiveTenant).toHaveBeenCalledWith("t2", "San Pedro");
    expect(result.current.dialogOpen).toBe(false);
  });

  it("hasUnsavedChanges is true when dialog is open and store reports dirty", () => {
    const { result } = renderHook(() => useTenantSwitch(), {
      wrapper: makeWrapper(authStore, true),
    });

    expect(result.current.hasUnsavedChanges).toBe(false); // dialog closed

    act(() => {
      result.current.onSelect("t2");
    });

    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it("double-click onConfirm is debounced (second call is no-op)", () => {
    const { result } = renderHook(() => useTenantSwitch(), {
      wrapper: makeWrapper(authStore),
    });

    act(() => {
      result.current.onSelect("t2");
    });

    act(() => {
      result.current.onConfirm();
      result.current.onConfirm();
    });

    expect(setActiveTenant).toHaveBeenCalledTimes(1);
  });
});
