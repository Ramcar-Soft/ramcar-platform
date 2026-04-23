/// <reference types="@testing-library/jest-dom/vitest" />
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ExtendedUserProfile } from "../types";
import type { PaginatedResponse } from "@ramcar/shared";

vi.mock("next/navigation", () => ({
  useRouter: () => ({}),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const mockUsersData: PaginatedResponse<ExtendedUserProfile> = {
  data: [
    {
      id: "p1", userId: "u1", tenantId: "t1", tenantName: "Tenant", tenantIds: ["t1"],
      fullName: "Alice", email: "alice@x.com", role: "admin", address: null,
      username: "alice", phone: "555-1", phoneType: null, status: "active",
      userGroupIds: [], userGroups: [], observations: null,
      createdAt: "2026-01-01", updatedAt: "2026-01-01", canEdit: true, canDeactivate: true,
    },
    {
      id: "p2", userId: "u2", tenantId: "t1", tenantName: "Tenant", tenantIds: ["t1"],
      fullName: "Bob", email: "bob@x.com", role: "guard", address: null,
      username: "bob", phone: "555-2", phoneType: null, status: "inactive",
      userGroupIds: [], userGroups: [], observations: null,
      createdAt: "2026-01-01", updatedAt: "2026-01-01", canEdit: true, canDeactivate: true,
    },
    {
      id: "p3", userId: "u3", tenantId: "t1", tenantName: "Tenant", tenantIds: [],
      fullName: "Carol", email: "carol@x.com", role: "super_admin", address: null,
      username: "carol", phone: "555-3", phoneType: null, status: "active",
      userGroupIds: [], userGroups: [], observations: null,
      createdAt: "2026-01-01", updatedAt: "2026-01-01", canEdit: false, canDeactivate: false,
    },
  ],
  meta: { page: 1, pageSize: 10, total: 3, totalPages: 1 },
};

vi.mock("../hooks/use-users", () => ({
  useUsers: () => ({ data: mockUsersData, isLoading: false, isError: false }),
}));
vi.mock("@/features/tenants/hooks/use-tenants", () => ({
  useTenants: () => ({
    data: {
      data: [],
      meta: { page: 1, page_size: 25, total: 0, total_pages: 0 },
    },
    isLoading: false,
  }),
}));
vi.mock("../hooks/use-user-groups", () => ({
  useUserGroups: () => ({ data: [], isLoading: false }),
}));
vi.mock("../hooks/use-get-user", () => ({
  useGetUser: () => ({ data: undefined, isLoading: false, isError: false, isFetching: false }),
}));
vi.mock("../hooks/use-create-user", () => ({
  useCreateUser: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("../hooks/use-update-user", () => ({
  useUpdateUser: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/shared/hooks/use-form-persistence", () => ({
  useFormPersistence: () => ({ wasRestored: false, discardDraft: vi.fn(), clearDraft: vi.fn() }),
}));

vi.mock("@ramcar/store", () => ({
  useAppStore: (selector: (s: unknown) => unknown) =>
    selector({ user: { userId: "u1", role: "super_admin", tenantId: "t1" } }),
}));

import { UsersTable } from "../components/users-table";

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("UsersTable interaction", () => {
  beforeEach(() => {
    cleanup();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("renders inactive rows with opacity-60", () => {
    renderWithClient(<UsersTable />);
    const bob = screen.getByText("Bob").closest("tr")!;
    expect(bob.className).toMatch(/opacity-60/);
    const alice = screen.getByText("Alice").closest("tr")!;
    expect(alice.className).not.toMatch(/opacity-60/);
  });

  it("ArrowDown highlights the first row, ArrowDown again highlights the second", () => {
    renderWithClient(<UsersTable />);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    const first = screen.getByText("Alice").closest("tr")!;
    expect(first.getAttribute("aria-selected")).toBe("true");
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    const second = screen.getByText("Bob").closest("tr")!;
    expect(second.getAttribute("aria-selected")).toBe("true");
  });

  it("Enter on a highlighted editable row opens the edit Sheet", () => {
    renderWithClient(<UsersTable />);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "sidebar.editTitle" })).toBeTruthy();
  });

  it("Enter on a non-editable row is a no-op", () => {
    renderWithClient(<UsersTable />);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    const carol = screen.getByText("Carol").closest("tr")!;
    expect(carol.getAttribute("aria-selected")).toBe("true");
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("clicking an editable row opens the edit Sheet", () => {
    renderWithClient(<UsersTable />);
    fireEvent.click(screen.getByText("Alice").closest("tr")!);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "sidebar.editTitle" })).toBeTruthy();
  });

  it("clicking a non-editable row does not open the Sheet", () => {
    renderWithClient(<UsersTable />);
    fireEvent.click(screen.getByText("Carol").closest("tr")!);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("pressing B focuses the search input when no input is focused", () => {
    renderWithClient(<UsersTable />);
    const search = screen.getByPlaceholderText("searchPlaceholder") as HTMLInputElement;
    expect(document.activeElement).not.toBe(search);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "b", bubbles: true }));
    });
    expect(document.activeElement).toBe(search);
  });

  it("ArrowDown does not change highlighted row while Sheet is open (T025)", () => {
    renderWithClient(<UsersTable />);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    const first = screen.getByText("Alice").closest("tr")!;
    expect(first.getAttribute("aria-selected")).toBe("true");

    fireEvent.click(screen.getByText("Alice").closest("tr")!);
    expect(screen.getByRole("dialog")).toBeTruthy();

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    expect(first.getAttribute("aria-selected")).toBe("true");
    const second = screen.getByText("Bob").closest("tr")!;
    expect(second.getAttribute("aria-selected")).not.toBe("true");
  });
});
