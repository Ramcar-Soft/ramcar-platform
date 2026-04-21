/// <reference types="@testing-library/jest-dom/vitest" />
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ExtendedUserProfile } from "../types";
import type { PaginatedResponse } from "@ramcar/shared";

const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const mockUsersData: PaginatedResponse<ExtendedUserProfile> = {
  data: [
    {
      id: "p1", userId: "u1", tenantId: "t1", tenantName: "Tenant",
      fullName: "Alice", email: "alice@x.com", role: "admin", address: null,
      username: "alice", phone: "555-1", phoneType: null, status: "active",
      userGroupIds: [], userGroups: [], observations: null,
      createdAt: "2026-01-01", updatedAt: "2026-01-01", canEdit: true, canDeactivate: true,
    },
    {
      id: "p2", userId: "u2", tenantId: "t1", tenantName: "Tenant",
      fullName: "Bob", email: "bob@x.com", role: "guard", address: null,
      username: "bob", phone: "555-2", phoneType: null, status: "inactive",
      userGroupIds: [], userGroups: [], observations: null,
      createdAt: "2026-01-01", updatedAt: "2026-01-01", canEdit: true, canDeactivate: true,
    },
    {
      id: "p3", userId: "u3", tenantId: "t1", tenantName: "Tenant",
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
vi.mock("../hooks/use-tenants", () => ({
  useTenants: () => ({ data: [] }),
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
    mockRouterPush.mockReset();
    cleanup();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("renders inactive rows with opacity-60", () => {
    renderWithClient(<UsersTable locale="en" />);
    const bob = screen.getByText("Bob").closest("tr")!;
    expect(bob.className).toMatch(/opacity-60/);
    const alice = screen.getByText("Alice").closest("tr")!;
    expect(alice.className).not.toMatch(/opacity-60/);
  });

  it("ArrowDown highlights the first row, ArrowDown again highlights the second", () => {
    renderWithClient(<UsersTable locale="en" />);
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

  it("Enter on a highlighted editable row navigates to the edit route", () => {
    renderWithClient(<UsersTable locale="en" />);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(mockRouterPush).toHaveBeenCalledWith("/en/catalogs/users/p1/edit");
  });

  it("Enter on a non-editable row is a no-op", () => {
    renderWithClient(<UsersTable locale="en" />);
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
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("clicking an editable row navigates to the edit route", () => {
    renderWithClient(<UsersTable locale="en" />);
    fireEvent.click(screen.getByText("Alice").closest("tr")!);
    expect(mockRouterPush).toHaveBeenCalledWith("/en/catalogs/users/p1/edit");
  });

  it("clicking a non-editable row does not navigate", () => {
    renderWithClient(<UsersTable locale="en" />);
    fireEvent.click(screen.getByText("Carol").closest("tr")!);
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("pressing B focuses the search input when no input is focused", () => {
    renderWithClient(<UsersTable locale="en" />);
    const search = screen.getByPlaceholderText("searchPlaceholder") as HTMLInputElement;
    expect(document.activeElement).not.toBe(search);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "b", bubbles: true }));
    });
    expect(document.activeElement).toBe(search);
  });
});
