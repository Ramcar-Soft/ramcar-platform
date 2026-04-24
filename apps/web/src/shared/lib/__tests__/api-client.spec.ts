import { vi, describe, it, expect, beforeEach } from "vitest";

const ACTIVE_TENANT_KEY = "ramcar.auth.activeTenantId";
const TENANT_A = "3d8b2fbc-0000-0000-0000-000000000001";

// Mock supabase client
vi.mock("@/shared/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: { access_token: "test-token" } } }),
    },
  }),
}));

// Track fetch calls
let lastFetchCall: { url: string; init: RequestInit } | null = null;

beforeEach(() => {
  lastFetchCall = null;
  localStorage.clear();

  global.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    lastFetchCall = { url: String(url), init: init ?? {} };
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch;
});

describe("apiClient header injection", () => {
  it("attaches X-Active-Tenant-Id for scoped URLs", async () => {
    localStorage.setItem(ACTIVE_TENANT_KEY, TENANT_A);
    // Dynamic import to pick up fresh module with our mocks.
    const { apiClient } = await import("../api-client");
    await apiClient.get("/users");

    const headers = lastFetchCall?.init?.headers as Record<string, string>;
    expect(headers?.["X-Active-Tenant-Id"]).toBe(TENANT_A);
  });

  it("does NOT attach X-Active-Tenant-Id for exempt auth paths", async () => {
    localStorage.setItem(ACTIVE_TENANT_KEY, TENANT_A);
    const { apiClient } = await import("../api-client");
    await apiClient.get("/auth/me");

    const headers = lastFetchCall?.init?.headers as Record<string, string>;
    expect(headers?.["X-Active-Tenant-Id"]).toBeUndefined();
  });

  it("does NOT attach X-Active-Tenant-Id for tenants path (selector)", async () => {
    localStorage.setItem(ACTIVE_TENANT_KEY, TENANT_A);
    const { apiClient } = await import("../api-client");
    await apiClient.get("/tenants");

    const headers = lastFetchCall?.init?.headers as Record<string, string>;
    expect(headers?.["X-Active-Tenant-Id"]).toBeUndefined();
  });

  it("rejects with an error when activeTenantId is absent on a scoped URL", async () => {
    localStorage.removeItem(ACTIVE_TENANT_KEY);
    const { apiClient } = await import("../api-client");
    await expect(apiClient.get("/users")).rejects.toThrow(/No active tenant set/);
  });
});
