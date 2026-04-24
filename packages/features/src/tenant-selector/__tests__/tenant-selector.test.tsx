import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StoreProvider } from "@ramcar/store";
import { TransportProvider, I18nProvider, RoleProvider } from "../../adapters";
import type { TransportPort, I18nPort, RolePort } from "../../adapters";
import { AuthStoreProvider, type AuthStorePort } from "../../adapters/tenant-selector-adapters";
import { TenantSelector } from "../components/tenant-selector";

afterEach(() => cleanup());

vi.mock("../hooks/use-tenant-list", () => ({
  useTenantList: () => ({
    data: [
      { id: "t1", name: "Los Robles", slug: "los-robles", status: "active", image_path: null },
      { id: "t2", name: "San Pedro", slug: "san-pedro", status: "active", image_path: null },
      { id: "t3", name: "Valle Verde", slug: "valle-verde", status: "inactive", image_path: null },
    ],
  }),
}));

const mockI18n: I18nPort = { t: (key) => key, locale: "en" };
const mockRole: RolePort = { role: "Admin", tenantId: "t1", userId: "u1" };
const mockTransport: TransportPort = {
  get: async () => ({ data: [], meta: {} }) as never,
  post: async (_, d) => d as never,
  patch: async (_, d) => d as never,
  put: async (_, d) => d as never,
  delete: async () => undefined as never,
  upload: async () => ({}) as never,
};

function renderSelector(
  authStore: AuthStorePort,
  role: Partial<RolePort> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <StoreProvider>
      <QueryClientProvider client={queryClient}>
        <TransportProvider value={mockTransport}>
          <I18nProvider value={mockI18n}>
            <RoleProvider value={{ ...mockRole, ...role }}>
              <AuthStoreProvider value={authStore}>
                <TenantSelector supabaseUrl="" />
              </AuthStoreProvider>
            </RoleProvider>
          </I18nProvider>
        </TransportProvider>
      </QueryClientProvider>
    </StoreProvider>,
  );
}

describe("TenantSelector", () => {
  it("renders null when tenantIds has fewer than 2 entries", () => {
    const store: AuthStorePort = {
      tenantIds: ["t1"],
      activeTenantId: "t1",
      activeTenantName: "Los Robles",
      setActiveTenant: vi.fn(),
    };
    const { container } = renderSelector(store);
    expect(container.firstChild).toBeNull();
  });

  it("renders the trigger button when user has multiple tenants", () => {
    const store: AuthStorePort = {
      tenantIds: ["t1", "t2"],
      activeTenantId: "t1",
      activeTenantName: "Los Robles",
      setActiveTenant: vi.fn(),
    };
    renderSelector(store);
    expect(screen.getByRole("combobox")).toBeDefined();
    expect(screen.getByText("Los Robles")).toBeDefined();
  });

  it("opens the combobox popover on trigger click", async () => {
    const user = userEvent.setup();
    const store: AuthStorePort = {
      tenantIds: ["t1", "t2"],
      activeTenantId: "t1",
      activeTenantName: "Los Robles",
      setActiveTenant: vi.fn(),
    };
    renderSelector(store);
    await user.click(screen.getByRole("combobox"));
    expect(await screen.findByText("San Pedro")).toBeInTheDocument();
  });

  it("calls setActiveTenant with selected tenant id and name", async () => {
    const user = userEvent.setup();
    const setActiveTenant = vi.fn();
    const store: AuthStorePort = {
      tenantIds: ["t1", "t2"],
      activeTenantId: "t1",
      activeTenantName: "Los Robles",
      setActiveTenant,
    };
    renderSelector(store);
    await user.click(screen.getByRole("combobox"));
    await screen.findByText("San Pedro");
    await user.click(screen.getByText("San Pedro"));
    expect(setActiveTenant).toHaveBeenCalledWith("t2", "San Pedro");
  });

  it("shows inactive badge for SuperAdmin on inactive tenants", async () => {
    const user = userEvent.setup();
    const store: AuthStorePort = {
      tenantIds: ["t1", "t2", "t3"],
      activeTenantId: "t1",
      activeTenantName: "Los Robles",
      setActiveTenant: vi.fn(),
    };
    renderSelector(store, { role: "SuperAdmin" });
    await user.click(screen.getByRole("combobox"));
    await screen.findByText("Valle Verde");
    expect(screen.getByText("tenants.status.inactive")).toBeDefined();
  });

  it("does not call setActiveTenant when selecting already-active tenant", async () => {
    const user = userEvent.setup();
    const setActiveTenant = vi.fn();
    const store: AuthStorePort = {
      tenantIds: ["t1", "t2"],
      activeTenantId: "t1",
      activeTenantName: "Los Robles",
      setActiveTenant,
    };
    renderSelector(store);
    await user.click(screen.getByRole("combobox"));
    await screen.findByText("San Pedro");
    const listItems = screen.getAllByText("Los Robles");
    // The first occurrence is the trigger text, subsequent ones are in the command list
    const listItem = listItems.find((el) => el.tagName.toLowerCase() === "span" && el.closest("[cmdk-item]"));
    if (listItem) {
      await user.click(listItem);
    }
    expect(setActiveTenant).not.toHaveBeenCalled();
  });
});
