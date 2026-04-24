/**
 * T065 — Focused test verifying that exempt endpoints do NOT receive
 * the X-Active-Tenant-Id header regardless of the stored activeTenantId.
 *
 * Exempt paths (per contracts/http-active-tenant-header.md):
 *   /auth/*, /tenants (selector), /users/me, /health, /version
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const ACTIVE_TENANT_KEY = "ramcar.auth.activeTenantId";
const TENANT_A = "3d8b2fbc-0000-0000-0000-000000000001";

vi.mock("@/shared/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: { access_token: "test-token" } } }),
    },
  }),
}));

let lastFetchCall: { url: string; init: RequestInit } | null = null;

beforeEach(() => {
  lastFetchCall = null;
  localStorage.clear();

  global.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    lastFetchCall = { url: String(url), init: init ?? {} };
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch;
});

describe("apiClient exempt endpoints — no X-Active-Tenant-Id header", () => {
  const exemptPaths = [
    "/auth/login",
    "/auth/logout",
    "/auth/me",
    "/tenants",
    "/users/me",
    "/health",
    "/version",
  ];

  for (const path of exemptPaths) {
    it(`does NOT attach header for ${path}`, async () => {
      localStorage.setItem(ACTIVE_TENANT_KEY, TENANT_A);
      const { apiClient } = await import("../api-client");
      await apiClient.get(path).catch(() => {
        // Some paths may reject for non-header reasons; we only check headers
      });
      const headers = lastFetchCall?.init?.headers as Record<string, string> | undefined;
      expect(headers?.["X-Active-Tenant-Id"]).toBeUndefined();
    });
  }
});
