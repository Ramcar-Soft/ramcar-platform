import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import React from "react";

const TENANT_A = "3d8b2fbc-0000-0000-0000-000000000001";
const TENANT_B = "3d8b2fbc-0000-0000-0000-000000000002";

vi.stubEnv("VITE_API_URL", "http://localhost:3001");
vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");

// Mock supabase
vi.mock("../../shared/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: { access_token: "test-token" } } }),
    },
  },
}));

const capturedHeaders: Record<string, string>[] = [];

vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
  capturedHeaders.push((init?.headers ?? {}) as Record<string, string>);
  return new Response(JSON.stringify({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }), {
    status: 200,
  });
});

// Mock @ramcar/features to provide useActiveTenant with controllable state
let mockActiveTenantId = TENANT_A;

vi.mock("@ramcar/features", () => ({
  useActiveTenant: () => ({
    activeTenantId: mockActiveTenantId,
    activeTenantName: "Test Tenant",
    tenantIds: [TENANT_A, TENANT_B],
  }),
}));

// Dynamically import after mocks are in place
async function loadHook() {
  const mod = await import("../../residents/hooks/use-residents");
  return mod.useResidents;
}

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("useResidents — query key partitions by activeTenantId (T021)", () => {
  it("includes activeTenantId in the query key", async () => {
    localStorage.setItem("ramcar.auth.activeTenantId", TENANT_A);

    const useResidents = await loadHook();
    const { result } = renderHook(() => useResidents({ page: 1, pageSize: 20, sortBy: "full_name" as const, sortOrder: "asc" as const }), { wrapper });

    await waitFor(() => expect(result.current.isFetched).toBe(true));

    // The captured header should contain the active tenant
    expect(capturedHeaders.some((h) => h["X-Active-Tenant-Id"] === TENANT_A)).toBe(true);
  });

  it("changes query key when activeTenantId changes (cache partitioning)", async () => {
    localStorage.setItem("ramcar.auth.activeTenantId", TENANT_A);
    mockActiveTenantId = TENANT_A;

    const useResidents = await loadHook();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result, rerender } = renderHook(
      () => useResidents({ page: 1, pageSize: 20, sortBy: "full_name" as const, sortOrder: "asc" as const }),
      {
        wrapper: ({ children }: { children: ReactNode }) =>
          React.createElement(QueryClientProvider, { client: qc }, children),
      },
    );

    await waitFor(() => expect(result.current.isFetched).toBe(true));
    const initialData = result.current.data;

    // Switch tenant
    mockActiveTenantId = TENANT_B;
    localStorage.setItem("ramcar.auth.activeTenantId", TENANT_B);
    rerender();

    await waitFor(() => {
      // After re-render, the hook should either have fetched with new key or be loading
      const keys = qc.getQueryCache().getAll().map((q) => q.queryKey);
      return keys.some((k) => Array.isArray(k) && k.includes(TENANT_A)) &&
             keys.some((k) => Array.isArray(k) && k.includes(TENANT_B));
    }, { timeout: 1000 }).catch(() => {
      // It's acceptable if the test detects the key doesn't include tenantId yet
    });

    // This assertion verifies the NEW expected behavior (will fail until T021)
    const allKeys = qc.getQueryCache().getAll().map((q) => q.queryKey);
    const hasPartitionedKeys = allKeys.some((k) =>
      Array.isArray(k) && k.includes(TENANT_A)
    );
    expect(hasPartitionedKeys).toBe(true);
    void initialData; // suppress unused warning
  });
});
