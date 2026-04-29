/// <reference types="@testing-library/jest-dom/vitest" />
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ExtendedUserProfile } from "../types";
import type { UserFormData } from "../components/user-form";

afterEach(() => cleanup());

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/shared/hooks/use-form-persistence", () => ({
  useFormPersistence: () => ({
    wasRestored: false,
    discardDraft: vi.fn(),
    clearDraft: vi.fn(),
  }),
}));

vi.mock("@ramcar/store", () => ({
  useAppStore: (selector: (s: unknown) => unknown) =>
    selector({ user: { userId: "u1", role: "admin", tenantId: "t1" } }),
}));

// Capture UserForm props so tests can simulate submit/cancel
let capturedOnSubmit: ((data: UserFormData) => Promise<void> | void) | null = null;
let capturedMode: string | null = null;
let capturedInitialData: ExtendedUserProfile | undefined = undefined;

vi.mock("../components/user-form", () => ({
  UserForm: (props: {
    mode: string;
    initialData?: ExtendedUserProfile;
    onSubmit: (data: UserFormData) => Promise<void> | void;
    onCancel: () => void;
    tenants: unknown[];
    userGroups: unknown[];
    isPending: boolean;
  }) => {
    capturedOnSubmit = props.onSubmit;
    capturedMode = props.mode;
    capturedInitialData = props.initialData;
    return <div data-testid="user-form" data-mode={props.mode} />;
  },
}));

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();

vi.mock("../hooks/use-create-user", () => ({
  useCreateUser: () => ({
    mutate: mockCreateMutate,
    isPending: false,
    error: null,
  }),
}));

vi.mock("../hooks/use-update-user", () => ({
  useUpdateUser: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
    error: null,
  }),
}));

vi.mock("@/features/tenants/hooks/use-tenants", () => ({
  useTenants: () => ({
    data: {
      data: [
        {
          id: "t1",
          name: "Tenant A",
          slug: "tenant-a",
          address: "",
          status: "active",
          config: {},
          image_path: null,
          time_zone: "UTC",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        },
      ],
      meta: { page: 1, page_size: 100, total: 1, total_pages: 1 },
    },
    isLoading: false,
  }),
}));

vi.mock("../hooks/use-user-groups", () => ({
  useUserGroups: () => ({ data: [], isLoading: false }),
}));

let mockGetUserData: ExtendedUserProfile | undefined = undefined;
let mockGetUserIsLoading = false;
let mockGetUserIsError = false;
let mockGetUserIsFetching = false;
const mockGetUserEnabled = vi.fn();

vi.mock("../hooks/use-get-user", () => ({
  useGetUser: (id: string, opts?: { enabled?: boolean }) => {
    mockGetUserEnabled(id, opts);
    return {
      data: mockGetUserData,
      isLoading: mockGetUserIsLoading,
      isError: mockGetUserIsError,
      isFetching: mockGetUserIsFetching,
    };
  },
}));

import { UserSidebar } from "../components/user-sidebar";

function makeUser(overrides: Partial<ExtendedUserProfile> = {}): ExtendedUserProfile {
  return {
    id: "p1", userId: "u1", tenantId: "t1", tenantName: "Tenant A",
    tenantIds: ["t1"],
    fullName: "Alice", email: "alice@x.com", role: "admin", address: "123 St",
    username: "alice", phone: "555-1", phoneType: null, status: "active",
    userGroupIds: [], userGroups: [], observations: null,
    createdAt: "2026-01-01", updatedAt: "2026-01-01", canEdit: true, canDeactivate: true,
    ...overrides,
  };
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("UserSidebar — create mode", () => {
  beforeEach(() => {
    mockCreateMutate.mockReset();
    mockGetUserEnabled.mockClear();
    capturedOnSubmit = null;
    capturedMode = null;
    capturedInitialData = undefined;
    mockGetUserData = undefined;
    mockGetUserIsLoading = false;
    mockGetUserIsError = false;
    mockGetUserIsFetching = false;
  });

  it("open=false renders nothing (no dialog)", () => {
    renderWithClient(
      <UserSidebar open={false} mode="create" onClose={vi.fn()} />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("open=true mode=create renders dialog with createTitle heading", () => {
    renderWithClient(
      <UserSidebar open={true} mode="create" onClose={vi.fn()} />,
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "sidebar.createTitle" })).toBeTruthy();
  });

  it("open=true mode=create renders UserForm in create mode and does NOT call useGetUser with enabled=true", () => {
    renderWithClient(
      <UserSidebar open={true} mode="create" onClose={vi.fn()} />,
    );
    expect(screen.getByTestId("user-form")).toBeTruthy();
    expect(capturedMode).toBe("create");
    expect(capturedInitialData).toBeUndefined();

    const calls = mockGetUserEnabled.mock.calls;
    for (const [, opts] of calls) {
      expect(opts?.enabled).toBeFalsy();
    }
  });

  it("create mode: onSubmit wires mutate; onSuccess calls onClose", () => {
    const onClose = vi.fn();
    mockCreateMutate.mockImplementation((_data: unknown, callbacks?: { onSuccess?: () => void }) => {
      callbacks?.onSuccess?.();
    });

    renderWithClient(
      <UserSidebar open={true} mode="create" onClose={onClose} />,
    );

    act(() => {
      capturedOnSubmit?.({ fullName: "New", email: "new@x.com", role: "guard", tenantId: "t1", address: "a", username: "new", phone: "1", userGroupIds: [] });
    });

    expect(mockCreateMutate).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("UserSidebar — edit mode", () => {
  beforeEach(() => {
    mockUpdateMutate.mockReset();
    mockGetUserEnabled.mockClear();
    capturedOnSubmit = null;
    capturedMode = null;
    capturedInitialData = undefined;
    mockGetUserData = undefined;
    mockGetUserIsLoading = false;
    mockGetUserIsError = false;
    mockGetUserIsFetching = false;
  });

  it("open=false mode=edit does NOT fire useGetUser with enabled=true", () => {
    renderWithClient(
      <UserSidebar open={false} mode="edit" userId="u1" onClose={vi.fn()} />,
    );
    const calls = mockGetUserEnabled.mock.calls;
    for (const [, opts] of calls) {
      expect(opts?.enabled).toBeFalsy();
    }
  });

  it("open=true mode=edit while loading renders spinner, not UserForm", () => {
    mockGetUserIsLoading = true;
    renderWithClient(
      <UserSidebar open={true} mode="edit" userId="u1" onClose={vi.fn()} />,
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByTestId("user-sidebar-spinner")).toBeTruthy();
    expect(screen.queryByTestId("user-form")).toBeNull();
  });

  it("open=true mode=edit on error renders error banner, not UserForm", () => {
    mockGetUserIsError = true;
    renderWithClient(
      <UserSidebar open={true} mode="edit" userId="u1" onClose={vi.fn()} />,
    );
    expect(screen.getByText("errorLoading")).toBeTruthy();
    expect(screen.queryByTestId("user-form")).toBeNull();
  });

  it("open=true mode=edit with data renders UserForm in edit mode with initialData", () => {
    mockGetUserData = makeUser();
    renderWithClient(
      <UserSidebar open={true} mode="edit" userId="u1" onClose={vi.fn()} />,
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "sidebar.editTitle" })).toBeTruthy();
    const form = screen.getByTestId("user-form");
    expect(form.getAttribute("data-mode")).toBe("edit");
    expect(capturedInitialData?.fullName).toBe("Alice");
  });

  it("edit mode: onSubmit wires mutate; onSuccess calls onClose", () => {
    mockGetUserData = makeUser();
    const onClose = vi.fn();
    mockUpdateMutate.mockImplementation((_data: unknown, callbacks?: { onSuccess?: () => void }) => {
      callbacks?.onSuccess?.();
    });

    renderWithClient(
      <UserSidebar open={true} mode="edit" userId="u1" onClose={onClose} />,
    );

    act(() => {
      capturedOnSubmit?.({ fullName: "Alice Updated", email: "alice@x.com", role: "admin", tenantId: "t1", address: "a", username: "alice", phone: "1", userGroupIds: [] });
    });

    expect(mockUpdateMutate).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
