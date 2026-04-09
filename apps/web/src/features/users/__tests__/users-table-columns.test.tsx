/// <reference types="@testing-library/jest-dom/vitest" />
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { getUserColumns, SortableHeader } from "../components/users-table-columns";
import type { ExtendedUserProfile } from "../types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const mockUser: ExtendedUserProfile = {
  id: "p1",
  userId: "u1",
  tenantId: "t1",
  tenantName: "Test Tenant",
  fullName: "John Doe",
  email: "john@example.com",
  role: "guard",
  address: null,
  username: null,
  phone: "+1234567890",
  phoneType: null,
  status: "active",
  userGroupIds: [],
  userGroups: [{ id: "g1", name: "Moroso" }],
  observations: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  canEdit: true,
  canDeactivate: true,
};

describe("getUserColumns", () => {
  const t = (key: string) => key;
  const onEdit = vi.fn();
  const onToggleStatus = vi.fn();

  it("returns expected columns", () => {
    const columns = getUserColumns({ t, onEdit, onToggleStatus });
    const keys = columns.map((c) => c.key);
    expect(keys).toEqual([
      "full_name",
      "email",
      "role",
      "tenant",
      "phone",
      "status",
      "user_groups",
      "actions",
    ]);
  });

  it("marks sortable columns", () => {
    const columns = getUserColumns({ t, onEdit, onToggleStatus });
    const sortableKeys = columns.filter((c) => c.sortable).map((c) => c.key);
    expect(sortableKeys).toEqual(["full_name", "email", "role", "status"]);
  });

  it("renders user groups as comma-separated names", () => {
    const columns = getUserColumns({ t, onEdit, onToggleStatus });
    const groupCol = columns.find((c) => c.key === "user_groups")!;
    const { container } = render(<>{groupCol.render(mockUser)}</>);
    expect(container.textContent).toBe("Moroso");
  });

  it("renders dash for empty user groups", () => {
    const columns = getUserColumns({ t, onEdit, onToggleStatus });
    const groupCol = columns.find((c) => c.key === "user_groups")!;
    const { container } = render(
      <>{groupCol.render({ ...mockUser, userGroups: [] })}</>,
    );
    expect(container.textContent).toBe("—");
  });

  it("renders phone or dash", () => {
    const columns = getUserColumns({ t, onEdit, onToggleStatus });
    const phoneCol = columns.find((c) => c.key === "phone")!;
    const { container } = render(<>{phoneCol.render(mockUser)}</>);
    expect(container.textContent).toBe("+1234567890");

    const { container: c2 } = render(
      <>{phoneCol.render({ ...mockUser, phone: null })}</>,
    );
    expect(c2.textContent).toBe("—");
  });
});

describe("SortableHeader", () => {
  it("renders children and sort icon", () => {
    render(<SortableHeader onSort={() => {}}>Name</SortableHeader>);
    expect(screen.getByText("Name")).toBeInTheDocument();
  });

  it("calls onSort when clicked", () => {
    const onSort = vi.fn();
    const { container } = render(
      <SortableHeader onSort={onSort}>Name</SortableHeader>,
    );

    const button = container.querySelector("button")!;
    button.click();
    expect(onSort).toHaveBeenCalledTimes(1);
  });
});
