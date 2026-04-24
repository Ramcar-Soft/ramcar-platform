/**
 * T041 — Vitest tests for the activeTenantId → URL seeding behaviour in
 * useLogbookFilters.  These tests are written FIRST and will be red until
 * T043 (the actual implementation) is shipped.
 *
 * Spec (021-tenant-selector-scope, User Story 3):
 *   (a) mount with no URL tenant_id  → URL rewrites to activeTenantId
 *   (b) mount with URL tenant_id = B, activeTenantId = A → URL preserved (user override)
 *   (c) activeTenantId changes A→B while mounted → URL rewrites to B
 *   (d) unmount + remount with fresh activeTenantId = A → URL reseeds to A
 *   (e) super-admin with tenant_id = "ALL" on mount → URL preserved (NOT overridden)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports that would pull the real modules
// ---------------------------------------------------------------------------

const mockReplace = vi.fn();
let mockSearchParamsString = "";
let mockPathname = "/en/logbook/visitors";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(mockSearchParamsString),
  usePathname: () => mockPathname,
}));

// activeTenantId is controlled per-test via this ref
let mockActiveTenantId = "tenant-A";
let mockTenantIds = ["tenant-A", "tenant-B"];

vi.mock("@ramcar/features", () => ({
  useActiveTenant: () => ({
    activeTenantId: mockActiveTenantId,
    activeTenantName: "Tenant A",
    tenantIds: mockTenantIds,
  }),
}));

// ---------------------------------------------------------------------------
// SUT — imported AFTER mocks so vi.mock hoisting takes effect
// ---------------------------------------------------------------------------
import { useLogbookFilters } from "../use-logbook-filters";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSearchParams(overrides: Record<string, string> = {}): string {
  const p = new URLSearchParams(overrides);
  return p.toString();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useLogbookFilters — activeTenantId seeding", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockActiveTenantId = "tenant-A";
    mockTenantIds = ["tenant-A", "tenant-B"];
    mockSearchParamsString = "";
    mockPathname = "/en/logbook/visitors";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // (a) mount with no URL tenant_id → URL rewrites to activeTenantId
  it("(a) seeds URL tenant_id from activeTenantId when URL has no tenant_id", () => {
    mockSearchParamsString = ""; // no tenant_id in URL
    mockActiveTenantId = "tenant-A";

    renderHook(() => useLogbookFilters());

    // router.replace should have been called with tenant_id=tenant-A
    expect(mockReplace).toHaveBeenCalledTimes(1);
    const calledUrl: string = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).toContain("tenant_id=tenant-A");
  });

  // (b) mount with URL tenant_id = B, activeTenantId = A → URL preserved
  it("(b) preserves existing URL tenant_id when user has already overridden it", () => {
    mockSearchParamsString = buildSearchParams({ tenant_id: "tenant-B" });
    mockActiveTenantId = "tenant-A";

    renderHook(() => useLogbookFilters());

    // router.replace must NOT have been called to overwrite tenant-B
    expect(mockReplace).not.toHaveBeenCalled();
  });

  // (c) activeTenantId changes A→B while mounted → URL rewrites to B
  it("(c) rewrites URL tenant_id when top-bar activeTenantId changes", () => {
    mockSearchParamsString = buildSearchParams({ tenant_id: "tenant-A" });
    mockActiveTenantId = "tenant-A";

    const { rerender } = renderHook(() => useLogbookFilters());

    // No rewrite on first render — tenant matches
    mockReplace.mockClear();

    // Simulate top-bar switching to tenant-B
    act(() => {
      mockActiveTenantId = "tenant-B";
      // searchParams still shows old value (URL hasn't updated yet)
      mockSearchParamsString = buildSearchParams({ tenant_id: "tenant-A" });
    });

    rerender();

    expect(mockReplace).toHaveBeenCalledTimes(1);
    const calledUrl: string = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).toContain("tenant_id=tenant-B");
  });

  // (d) unmount + remount with fresh activeTenantId = A → URL reseeds to A
  it("(d) reseeds URL on remount when URL tenant_id is absent", () => {
    mockActiveTenantId = "tenant-A";
    mockSearchParamsString = ""; // No tenant_id at all

    const { unmount } = renderHook(() => useLogbookFilters());
    expect(mockReplace).toHaveBeenCalledTimes(1);

    unmount();
    mockReplace.mockClear();

    // Remount — URL still has no tenant_id
    mockSearchParamsString = "";
    renderHook(() => useLogbookFilters());

    expect(mockReplace).toHaveBeenCalledTimes(1);
    const calledUrl: string = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).toContain("tenant_id=tenant-A");
  });

  // (e) super-admin with tenant_id = "ALL" on mount → URL preserved
  it("(e) does NOT override the ALL sentinel for super-admin cross-tenant mode", () => {
    mockSearchParamsString = buildSearchParams({ tenant_id: "ALL" });
    mockActiveTenantId = "tenant-A"; // even if activeTenantId is set

    renderHook(() => useLogbookFilters());

    // router.replace must NOT be called — ALL is a valid super-admin sentinel
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
