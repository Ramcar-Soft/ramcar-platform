import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StoreProvider } from "@ramcar/store";
import { TransportProvider, I18nProvider, RoleProvider } from "@ramcar/features/adapters";
import type { TransportPort, I18nPort, RolePort } from "@ramcar/features/adapters";
import { AuthStoreProvider, type AuthStorePort } from "@ramcar/features/tenant-selector";
import { UnsavedChangesProvider, AnalyticsProvider } from "@ramcar/features/adapters";
import { TenantSelector } from "@ramcar/features/tenant-selector";

afterEach(() => cleanup());

vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");

vi.mock("@ramcar/features/tenant-selector", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@ramcar/features/tenant-selector")>();
  return {
    ...actual,
    useTenantList: () => ({
      data: [
        { id: "t1", name: "Residencial Demo", slug: "demo", status: "active", image_path: null },
      ],
    }),
  };
});

const mockI18n: I18nPort = { t: (key) => key, locale: "en" };
const mockTransport: TransportPort = {
  get: async () => ({ data: [], meta: {} }) as never,
  post: async (_, d) => d as never,
  patch: async (_, d) => d as never,
  put: async (_, d) => d as never,
  delete: async () => undefined as never,
  upload: async () => ({}) as never,
};

function renderSelector(authStore: AuthStorePort, role: Partial<RolePort> = {}) {
  const defaultRole: RolePort = { role: "Guard", tenantId: "t1", userId: "u1" };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <StoreProvider>
      <QueryClientProvider client={queryClient}>
        <TransportProvider value={mockTransport}>
          <I18nProvider value={mockI18n}>
            <RoleProvider value={{ ...defaultRole, ...role }}>
              <AuthStoreProvider value={authStore}>
                <UnsavedChangesProvider value={{ hasUnsavedChanges: () => false }}>
                  <AnalyticsProvider value={{ track: vi.fn() }}>
                    <TenantSelector />
                  </AnalyticsProvider>
                </UnsavedChangesProvider>
              </AuthStoreProvider>
            </RoleProvider>
          </I18nProvider>
        </TransportProvider>
      </QueryClientProvider>
    </StoreProvider>,
  );
}

/**
 * Spec 024 FR-007: desktop booth app must apply the same selector-hide rule as the web portal.
 */
describe("TenantSelector — desktop Guard visibility (spec 024 FR-007)", () => {
  it("Guard with one tenant sees no combobox", () => {
    const store: AuthStorePort = {
      tenantIds: ["t1"],
      activeTenantId: "t1",
      activeTenantName: "Residencial Demo",
      setActiveTenant: vi.fn(),
    };
    const { container } = renderSelector(store, { role: "Guard" });
    expect(container.querySelector("[role='combobox']")).toBeNull();
    expect(screen.getByText("Residencial Demo")).toBeDefined();
  });

  it("Guard with multiple tenant_ids (legacy data) still sees no combobox", () => {
    const store: AuthStorePort = {
      tenantIds: ["t1", "t2"],
      activeTenantId: "t1",
      activeTenantName: "Residencial Demo",
      setActiveTenant: vi.fn(),
    };
    const { container } = renderSelector(store, { role: "Guard" });
    expect(container.querySelector("[role='combobox']")).toBeNull();
  });
});
