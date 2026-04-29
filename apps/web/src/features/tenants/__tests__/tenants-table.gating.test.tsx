/// <reference types="@testing-library/jest-dom/vitest" />
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(() => cleanup());

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string) => (ns ? `${ns}.${key}` : key),
}));

vi.mock("@/shared/lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

// useTenants returns a configurable list so we can test count-based branching
let mockTenantsData: { id: string; name: string }[] = [];
vi.mock("../hooks/use-tenants", () => ({
  useTenants: () => ({ data: { data: mockTenantsData }, isLoading: false }),
}));

// useRole from features adapters — configurable
let mockRole: string = "SuperAdmin";
vi.mock("@ramcar/features/adapters", () => ({
  useRole: () => ({ role: mockRole, tenantId: "t1", userId: "u1" }),
}));

// canCreateAnotherTenant and ContactSupportDialog from @ramcar/features
vi.mock("@ramcar/features", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@ramcar/features")>();
  return {
    ...actual,
    useKeyboardNavigation: () => {},
    ShortcutsHint: () => null,
    ContactSupportDialog: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
      open ? (
        <div role="dialog" aria-label="contact-support">
          <button onClick={onClose}>close</button>
        </div>
      ) : null,
  };
});

// TenantSidebar stub
vi.mock("../components/tenant-sidebar", () => ({
  TenantSidebar: ({ open }: { open: boolean }) =>
    open ? <div role="dialog" aria-label="tenant-sidebar" /> : null,
}));

vi.mock("../components/tenants-table-columns", () => ({
  useTenantsTableColumns: () => [],
}));

vi.mock("../components/tenant-filters", () => ({
  TenantFilters: React.forwardRef(() => null),
}));

import { TenantsTable } from "../components/tenants-table";

// ── Tests ────────────────────────────────────────────────────────────────────

describe("TenantsTable — create button gating (spec 024 FR-008/FR-009/FR-013)", () => {
  it("Admin with 0 tenants — Create opens the Sheet (TenantSidebar)", async () => {
    mockRole = "Admin";
    mockTenantsData = [];
    render(<TenantsTable />);

    await userEvent.click(screen.getByRole("button", { name: /tenants\.actions\.create/i }));

    expect(screen.queryByRole("dialog", { name: "contact-support" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "tenant-sidebar" })).toBeInTheDocument();
  });

  it("Admin with 1 tenant — Create opens ContactSupportDialog (not the Sheet)", async () => {
    mockRole = "Admin";
    mockTenantsData = [{ id: "t1", name: "T1" }];
    render(<TenantsTable />);

    await userEvent.click(screen.getByRole("button", { name: /tenants\.actions\.create/i }));

    expect(screen.queryByRole("dialog", { name: "tenant-sidebar" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "contact-support" })).toBeInTheDocument();
  });

  it("SuperAdmin always opens the Sheet regardless of tenant count", async () => {
    mockRole = "SuperAdmin";
    mockTenantsData = [{ id: "t1", name: "T1" }, { id: "t2", name: "T2" }];
    render(<TenantsTable />);

    await userEvent.click(screen.getByRole("button", { name: /tenants\.actions\.create/i }));

    expect(screen.queryByRole("dialog", { name: "contact-support" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "tenant-sidebar" })).toBeInTheDocument();
  });

  it("ContactSupportDialog can be closed and the next click re-evaluates", async () => {
    mockRole = "Admin";
    mockTenantsData = [{ id: "t1", name: "T1" }];
    render(<TenantsTable />);

    const createBtn = screen.getByRole("button", { name: /tenants\.actions\.create/i });
    await userEvent.click(createBtn);

    const dialog = screen.getByRole("dialog", { name: "contact-support" });
    expect(dialog).toBeInTheDocument();

    // Close the dialog
    await userEvent.click(screen.getByRole("button", { name: "close" }));
    expect(screen.queryByRole("dialog", { name: "contact-support" })).toBeNull();

    // Click Create again — dialog should reappear (re-evaluated, no cached state)
    await userEvent.click(createBtn);
    expect(screen.getByRole("dialog", { name: "contact-support" })).toBeInTheDocument();
  });
});
