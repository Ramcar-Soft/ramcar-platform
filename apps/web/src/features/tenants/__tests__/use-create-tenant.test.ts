import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPost = vi.fn();
const mockRefreshSession = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockSetTenantIds = vi.fn();

vi.mock("@/shared/lib/api-client", () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

vi.mock("@/shared/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { refreshSession: mockRefreshSession },
  }),
}));

vi.mock("@ramcar/store", () => ({
  useAppStore: (selector: (state: { setTenantIds: typeof mockSetTenantIds }) => unknown) =>
    selector({ setTenantIds: mockSetTenantIds }),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );
  return {
    ...actual,
    useMutation: vi.fn((opts: Record<string, unknown>) => opts),
    useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useCreateTenant", () => {
  it("posts the dto to /tenants", async () => {
    const { useCreateTenant } = await import("../hooks/use-create-tenant");
    const result = useCreateTenant();
    await (result as any).mutationFn({ name: "Acme", address: "123 St" });
    expect(mockPost).toHaveBeenCalledWith("/tenants", {
      name: "Acme",
      address: "123 St",
    });
  });

  it("refreshes the Supabase session on success and propagates tenant_ids to the store", async () => {
    mockRefreshSession.mockResolvedValueOnce({
      data: {
        session: {
          user: { app_metadata: { tenant_ids: ["t-old", "t-new"] } },
        },
      },
      error: null,
    });
    const { useCreateTenant } = await import("../hooks/use-create-tenant");
    const result = useCreateTenant();
    await (result as any).onSuccess();

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockSetTenantIds).toHaveBeenCalledWith(["t-old", "t-new"]);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["tenants"] });
  });

  it("falls back to an empty tenant_ids array when the refreshed session lacks the claim", async () => {
    mockRefreshSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    const { useCreateTenant } = await import("../hooks/use-create-tenant");
    const result = useCreateTenant();
    await (result as any).onSuccess();

    expect(mockSetTenantIds).toHaveBeenCalledWith([]);
    expect(mockInvalidateQueries).toHaveBeenCalled();
  });
});
