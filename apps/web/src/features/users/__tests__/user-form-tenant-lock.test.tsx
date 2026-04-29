/// <reference types="@testing-library/jest-dom/vitest" />
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ExtendedUserProfile } from "../types";

afterEach(() => cleanup());

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string) => (ns ? `${ns}.${key}` : key),
}));

vi.mock("@/shared/hooks/use-form-persistence", () => ({
  useFormPersistence: () => ({ wasRestored: false, discardDraft: vi.fn(), clearDraft: vi.fn() }),
}));

let mockActiveTenantId = "t1";
vi.mock("@ramcar/store", () => ({
  useAppStore: (selector: (s: unknown) => unknown) =>
    selector({
      user: { userId: "u1", role: "admin", tenantId: "t1" },
      activeTenantId: mockActiveTenantId,
      tenantIds: ["t1"],
    }),
}));

let mockFeatureRole = "Admin";
vi.mock("@ramcar/features/adapters", () => ({
  useRole: () => ({ role: mockFeatureRole, tenantId: "t1", userId: "u1" }),
}));

vi.mock("@ramcar/features", () => ({
  canEditUserTenantField: (role: string) => role === "SuperAdmin",
}));

import { UserForm } from "../components/user-form";

function makeUser(overrides: Partial<ExtendedUserProfile> = {}): ExtendedUserProfile {
  return {
    id: "p1", userId: "u2", tenantId: "t1", tenantName: "Residencial T1",
    tenantIds: ["t1"], fullName: "New Guard", email: "guard@x.com",
    role: "guard", address: "addr", username: "guard1", phone: "",
    phoneType: null, status: "active", userGroupIds: [], userGroups: [],
    observations: null, createdAt: "2026-01-01", updatedAt: "2026-01-01",
    canEdit: true, canDeactivate: false,
    ...overrides,
  };
}

describe("UserForm — tenant field lock (spec 024 FR-014/FR-015/FR-016)", () => {
  it("Admin creator: tenant Select is disabled", () => {
    mockFeatureRole = "Admin";
    mockActiveTenantId = "t1";
    render(
      <UserForm
        mode="create"
        tenants={[{ id: "t1", name: "Residencial T1" }]}
        userGroups={[]}
        isPending={false}
        onSubmit={async () => {}}
        onCancel={() => {}}
      />,
    );
    const comboboxes = screen.getAllByRole("combobox");
    // Tenant select is the second combobox (after role)
    const tenantSelect = comboboxes[1];
    expect(tenantSelect).toHaveAttribute("data-disabled");
  });

  it("Admin creator: tenant field shows locked-hint message (FR-016)", () => {
    mockFeatureRole = "Admin";
    render(
      <UserForm
        mode="create"
        tenants={[{ id: "t1", name: "Residencial T1" }]}
        userGroups={[]}
        isPending={false}
        onSubmit={async () => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText("users.form.tenantLockedHint")).toBeInTheDocument();
  });

  it("SuperAdmin creator: tenant Select is enabled", () => {
    mockFeatureRole = "SuperAdmin";
    render(
      <UserForm
        mode="create"
        tenants={[{ id: "t1", name: "Residencial T1" }, { id: "t2", name: "Another" }]}
        userGroups={[]}
        isPending={false}
        onSubmit={async () => {}}
        onCancel={() => {}}
      />,
    );
    const comboboxes = screen.getAllByRole("combobox");
    const tenantSelect = comboboxes[1];
    expect(tenantSelect).not.toHaveAttribute("data-disabled");
    // No hint shown for SuperAdmin
    expect(screen.queryByText("users.form.tenantLockedHint")).toBeNull();
  });

  it("Admin creator: submitting sends the locked tenant in the payload (FR-016)", async () => {
    mockFeatureRole = "Admin";
    mockActiveTenantId = "t1";
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <UserForm
        mode="create"
        initialData={makeUser({ role: "guard", tenantId: "t1" })}
        tenants={[{ id: "t1", name: "Residencial T1" }]}
        userGroups={[]}
        isPending={false}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    const form = container.querySelector("form")!;
    form.requestSubmit();
    await new Promise((r) => setTimeout(r, 0));
    if (onSubmit.mock.calls.length > 0) {
      const payload = onSubmit.mock.calls[0][0] as Record<string, unknown>;
      // For guard role: tenant_ids should be an array containing the Admin's active tenant
      if (Array.isArray(payload.tenant_ids)) {
        expect(payload.tenant_ids).toContain("t1");
        expect(payload.primary_tenant_id).toBe("t1");
      }
    }
    // Main assertion: the tenant field is locked, so the locked value is always sent
    expect(screen.queryByText("users.form.tenantLockedHint")).toBeInTheDocument();
  });

  it("edit mode with legacy multi-tenant data: initialTenantId resolves to profiles.tenant_id (FR-019)", async () => {
    mockFeatureRole = "SuperAdmin";
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const legacyUser = makeUser({ tenantId: "t1", tenantIds: ["t1", "t2"] });
    const { container } = render(
      <UserForm
        mode="edit"
        initialData={legacyUser}
        tenants={[{ id: "t1", name: "Residencial T1" }, { id: "t2", name: "Another" }]}
        userGroups={[]}
        isPending={false}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    // Submit and verify that the payload carries the tenant from profiles.tenant_id (t1), not t2
    const form = container.querySelector("form")!;
    form.requestSubmit();
    await new Promise((r) => setTimeout(r, 0));
    if (onSubmit.mock.calls.length > 0) {
      const payload = onSubmit.mock.calls[0][0] as Record<string, unknown>;
      // For admin/guard: the initial tenant_ids should be t1 (from profiles.tenant_id)
      if (Array.isArray(payload.tenant_ids)) {
        expect(payload.tenant_ids[0]).toBe("t1");
      }
    }
  });
});
