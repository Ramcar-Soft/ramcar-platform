import { describe, it, expect, vi, beforeEach } from "vitest";

const TENANT_A = "3d8b2fbc-0000-0000-0000-000000000001";

vi.mock("@ramcar/features", () => ({
  useActiveTenant: () => ({
    activeTenantId: TENANT_A,
    activeTenantName: "Test Tenant",
    tenantIds: [TENANT_A],
  }),
}));

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockPatch = vi.fn();

vi.mock("@/shared/lib/api-client", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

vi.mock("@tanstack/react-query", () => {
  const actual = vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQuery: vi.fn((opts: Record<string, unknown>) => opts),
    useMutation: vi.fn((opts: Record<string, unknown>) => opts),
    useQueryClient: vi.fn(() => ({
      invalidateQueries: vi.fn(),
    })),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useUsers hook", () => {
  it("calls apiClient.get with filters", async () => {
    const { useUsers } = await import("../hooks/use-users");
    const filters = { page: 1, pageSize: 10, sortBy: "full_name", sortOrder: "asc" };
    const result = useUsers(filters as never) as any;
    await result.queryFn();
    expect(mockGet).toHaveBeenCalledWith("/users", { params: filters });
  });

  it("includes query key with filters", async () => {
    const { useUsers } = await import("../hooks/use-users");
    const filters = { page: 2, search: "test" };
    const result = useUsers(filters as never) as any;
    expect(result.queryKey).toContain("users");
  });
});

describe("useCreateUser hook", () => {
  it("calls apiClient.post with user data", async () => {
    const { useCreateUser } = await import("../hooks/use-create-user");
    const result = useCreateUser();
    const userData = {
      fullName: "Test",
      email: "test@test.com",
      role: "guard",
      tenantId: "t1",
      address: "123 St",
      username: "testuser",
      phone: "555-0100",
      userGroupIds: [],
    };
    await (result as any).mutationFn(userData as never);
    expect(mockPost).toHaveBeenCalledWith("/users", userData);
  });
});

describe("useUpdateUser hook", () => {
  it("calls apiClient.put with profile ID and data", async () => {
    const { useUpdateUser } = await import("../hooks/use-update-user");
    const result = useUpdateUser("profile-123");
    const updateData = { fullName: "Updated" };
    await (result as any).mutationFn(updateData as never);
    expect(mockPut).toHaveBeenCalledWith("/users/profile-123", updateData);
  });
});

describe("useToggleStatus hook", () => {
  it("calls apiClient.patch with status", async () => {
    const { useToggleStatus } = await import("../hooks/use-toggle-status");
    const result = useToggleStatus();
    await (result as any).mutationFn({ id: "p1", status: "inactive" });
    expect(mockPatch).toHaveBeenCalledWith("/users/p1/status", {
      status: "inactive",
    });
  });
});

describe("useGetUser hook", () => {
  it("calls apiClient.get with user ID", async () => {
    const { useGetUser } = await import("../hooks/use-get-user");
    const result = useGetUser("user-456") as any;
    await result.queryFn();
    expect(mockGet).toHaveBeenCalledWith("/users/user-456");
  });

  it("includes user ID in query key", async () => {
    const { useGetUser } = await import("../hooks/use-get-user");
    const result = useGetUser("user-456") as any;
    expect(result.queryKey).toContain("user-456");
  });
});

describe("useUserGroups hook", () => {
  it("calls apiClient.get for user-groups", async () => {
    mockGet.mockResolvedValue({ data: [{ id: "g1", name: "Group 1" }] });
    const { useUserGroups } = await import("../hooks/use-user-groups");
    const result = useUserGroups();
    const data = await (result as any).queryFn();
    expect(mockGet).toHaveBeenCalledWith("/user-groups");
    expect(data).toEqual([{ id: "g1", name: "Group 1" }]);
  });
});
