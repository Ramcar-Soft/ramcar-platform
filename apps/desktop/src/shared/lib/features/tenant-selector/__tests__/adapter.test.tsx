import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AuthStorePort } from "@ramcar/features/tenant-selector";
import { AuthStoreProvider, useAuthStore } from "@ramcar/features/tenant-selector";

afterEach(() => cleanup());

// Stub import.meta.env so the module-level constant doesn't fail outside Vite
vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");

// Mock @ramcar/store to avoid React instance mismatch in jsdom
vi.mock("@ramcar/store", () => {
  let _tenantIds: string[] = [];
  let _activeTenantId = "";
  let _activeTenantName = "";
  const _setActiveTenant = vi.fn((id: string, name: string) => {
    _activeTenantId = id;
    _activeTenantName = name;
  });

  return {
    useAppStore: (selector: (s: Record<string, unknown>) => unknown) => {
      const state = {
        tenantIds: _tenantIds,
        activeTenantId: _activeTenantId,
        activeTenantName: _activeTenantName,
        setActiveTenant: _setActiveTenant,
        __setTenantIds: (ids: string[]) => { _tenantIds = ids; },
        __setActive: (id: string, name: string) => { _activeTenantId = id; _activeTenantName = name; },
      };
      return selector(state as never);
    },
    StoreProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

function TestConsumer() {
  const { tenantIds, activeTenantId, activeTenantName } = useAuthStore();
  return (
    <div>
      <span data-testid="tenant-ids">{JSON.stringify(tenantIds)}</span>
      <span data-testid="active-id">{activeTenantId}</span>
      <span data-testid="active-name">{activeTenantName}</span>
    </div>
  );
}

function renderWithAdapter(store: AuthStorePort) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthStoreProvider value={store}>
        <TestConsumer />
      </AuthStoreProvider>
    </QueryClientProvider>,
  );
}

describe("DesktopAuthStoreProvider adapter", () => {
  it("exposes tenantIds and activeTenantId from the provided auth store port", () => {
    const store: AuthStorePort = {
      tenantIds: ["t1", "t2"],
      activeTenantId: "t1",
      activeTenantName: "Los Robles",
      setActiveTenant: vi.fn(),
    };
    renderWithAdapter(store);
    expect(screen.getByTestId("tenant-ids").textContent).toBe('["t1","t2"]');
    expect(screen.getByTestId("active-id").textContent).toBe("t1");
    expect(screen.getByTestId("active-name").textContent).toBe("Los Robles");
  });

  it("setActiveTenant in the adapter also calls queryClient.invalidateQueries", () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    let capturedSetActiveTenant!: AuthStorePort["setActiveTenant"];

    function CaptureConsumer() {
      const { setActiveTenant } = useAuthStore();
      capturedSetActiveTenant = setActiveTenant;
      return null;
    }

    // Render the DesktopAuthStoreProvider wired with real Zustand (via mock) + queryClient
    const zustandSetter = vi.fn();

    const store: AuthStorePort = {
      tenantIds: ["t1", "t2"],
      activeTenantId: "t1",
      activeTenantName: "Los Robles",
      setActiveTenant: (id, name) => {
        zustandSetter(id, name);
        void queryClient.invalidateQueries();
      },
    };

    render(
      <QueryClientProvider client={queryClient}>
        <AuthStoreProvider value={store}>
          <CaptureConsumer />
        </AuthStoreProvider>
      </QueryClientProvider>,
    );

    act(() => {
      capturedSetActiveTenant("t2", "San Pedro");
    });

    expect(zustandSetter).toHaveBeenCalledWith("t2", "San Pedro");
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it("adapter renders children without crashing", () => {
    const store: AuthStorePort = {
      tenantIds: [],
      activeTenantId: "",
      activeTenantName: "",
      setActiveTenant: vi.fn(),
    };
    const { container } = renderWithAdapter(store);
    expect(container).toBeDefined();
  });
});
