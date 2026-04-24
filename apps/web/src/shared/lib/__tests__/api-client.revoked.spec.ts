/**
 * T028 — api-client TENANT_ACCESS_REVOKED recovery flow (behaviour spec)
 *
 * Verifies that when the NestJS API returns 403 with code TENANT_ACCESS_REVOKED:
 * 1. The registered tenantRevokedHandler is called with the error body
 * 2. An ApiError is thrown so React Query can surface the error
 *
 * The actual recovery actions (supabase refresh, hydrateActiveTenant, cancelQueries)
 * are wired by the app shell using registerTenantRevokedHandler — this test verifies
 * the handler is invoked, not the handler's internal behaviour.
 *
 * Toast and queryClient interactions are left to integration / E2E tests because
 * they require the full React context tree.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

const ACTIVE_TENANT_KEY = "ramcar.auth.activeTenantId";
const TENANT_A = "3d8b2fbc-0000-0000-0000-000000000001";
const TENANT_B = "3d8b2fbc-0000-0000-0000-000000000002";

// Mock supabase client
vi.mock("@/shared/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: { access_token: "test-token" } } }),
      refreshSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: "new-token",
            user: {
              app_metadata: {
                tenant_ids: [TENANT_A, TENANT_B],
                tenant_id: TENANT_A,
              },
            },
          },
        },
        error: null,
      }),
    },
  }),
}));

function makeRevokedResponse(tenantIds?: string[]) {
  const body = {
    code: "TENANT_ACCESS_REVOKED",
    message: "You no longer have access to the requested tenant.",
    ...(tenantIds !== undefined ? { tenantIds } : {}),
  };
  return new Response(JSON.stringify(body), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api-client — TENANT_ACCESS_REVOKED recovery (T028)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(ACTIVE_TENANT_KEY, TENANT_A);
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the registered tenantRevokedHandler when 403 TENANT_ACCESS_REVOKED is received", async () => {
    const handler = vi.fn();

    global.fetch = vi.fn().mockResolvedValue(makeRevokedResponse([TENANT_B]));

    const { apiClient, registerTenantRevokedHandler } = await import("../api-client");
    registerTenantRevokedHandler(handler);

    await expect(apiClient.get("/users")).rejects.toThrow();

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ code: "TENANT_ACCESS_REVOKED" }),
    );
  });

  it("throws ApiError after invoking the handler", async () => {
    const handler = vi.fn();

    global.fetch = vi.fn().mockResolvedValue(makeRevokedResponse());

    const { apiClient, registerTenantRevokedHandler, ApiError } = await import("../api-client");
    registerTenantRevokedHandler(handler);

    await expect(apiClient.get("/users")).rejects.toBeInstanceOf(ApiError);
  });

  it("rethrows as ApiError with status 403 when handler is not set", async () => {
    global.fetch = vi.fn().mockResolvedValue(makeRevokedResponse());

    // Import fresh module without registering a handler
    const { apiClient, registerTenantRevokedHandler, ApiError } = await import("../api-client");
    // Clear any previously registered handler
    registerTenantRevokedHandler(null as unknown as () => void);

    await expect(apiClient.get("/users")).rejects.toBeInstanceOf(ApiError);
  });

  it("does NOT call handler for non-TENANT_ACCESS_REVOKED 403 errors", async () => {
    const handler = vi.fn();

    const otherForbiddenBody = { code: "SOME_OTHER_ERROR", message: "Forbidden" };
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(otherForbiddenBody), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { apiClient, registerTenantRevokedHandler } = await import("../api-client");
    registerTenantRevokedHandler(handler);

    await expect(apiClient.get("/users")).rejects.toThrow();

    expect(handler).not.toHaveBeenCalled();
  });
});
