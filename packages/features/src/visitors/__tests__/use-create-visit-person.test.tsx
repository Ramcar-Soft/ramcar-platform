import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StoreProvider } from "@ramcar/store";
import { TransportProvider, I18nProvider, RoleProvider, AuthStoreProvider } from "../../adapters";
import type { TransportPort, AuthStorePort } from "../../adapters";
import { useCreateVisitPerson } from "../hooks/use-create-visit-person";
import type { VisitPerson } from "../types";

const mockPerson: VisitPerson = {
  id: "new-person-id",
  tenantId: "test-tenant-id",
  type: "visitor",
  code: "V001",
  fullName: "Test Person",
  status: "allowed",
  phone: null,
  company: null,
  residentId: null,
  notes: null,
  registeredBy: "user-1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function createWrapper(transport: Partial<TransportPort>) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });

  const fullTransport: TransportPort = {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue(mockPerson),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
    ...transport,
  };

  const authStore: AuthStorePort = {
    tenantIds: ["test-tenant-id"],
    activeTenantId: "test-tenant-id",
    activeTenantName: "Test Tenant",
    setActiveTenant: vi.fn(),
  };

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <StoreProvider>
        <QueryClientProvider client={queryClient}>
          <TransportProvider value={fullTransport}>
            <I18nProvider value={{ t: (k) => k, locale: "en" }}>
              <RoleProvider value={{ role: "Guard", tenantId: "test-tenant-id", userId: "test-user-id" }}>
                <AuthStoreProvider value={authStore}>
                  {children}
                </AuthStoreProvider>
              </RoleProvider>
            </I18nProvider>
          </TransportProvider>
        </QueryClientProvider>
      </StoreProvider>
    );
  };
}

describe("useCreateVisitPerson", () => {
  it("calls transport.post with the correct path and payload", async () => {
    const postSpy = vi.fn().mockResolvedValue(mockPerson);
    const wrapper = createWrapper({ post: postSpy });

    const { result } = renderHook(() => useCreateVisitPerson(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        type: "visitor",
        fullName: "Test Person",
        status: "allowed",
      });
    });

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        "/visit-persons",
        expect.objectContaining({ fullName: "Test Person", type: "visitor" }),
      );
    });
  });
});
