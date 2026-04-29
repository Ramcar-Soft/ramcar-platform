/// <reference types="@testing-library/jest-dom/vitest" />
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ExtendedUserProfile } from "../types";

afterEach(() => cleanup());

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/shared/hooks/use-form-persistence", () => ({
  useFormPersistence: () => ({
    wasRestored: false,
    discardDraft: () => {},
    clearDraft: () => {},
  }),
}));

let mockCurrentUser: { userId: string; role: string; tenantId: string } | null = {
  userId: "u1",
  role: "admin",
  tenantId: "t1",
};
let mockActiveTenantId = "t1";
vi.mock("@ramcar/store", () => ({
  useAppStore: (selector: (s: unknown) => unknown) =>
    selector({ user: mockCurrentUser, activeTenantId: mockActiveTenantId, tenantIds: ["t1"] }),
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
    id: "p1", userId: "u1", tenantId: "t1", tenantName: "T",
    tenantIds: ["t1"],
    fullName: "Self", email: "self@x.com", role: "admin", address: "addr",
    username: "self", phone: "+525551234567", phoneType: null, status: "active",
    userGroupIds: [], userGroups: [], observations: null,
    createdAt: "2026-01-01", updatedAt: "2026-01-01",
    canEdit: true, canDeactivate: false,
    ...overrides,
  };
}

describe("UserForm role lock", () => {
  it("admin editing self: role Select is disabled and hint text is shown", () => {
    mockCurrentUser = { userId: "u1", role: "admin", tenantId: "t1" };
    mockFeatureRole = "Admin";
    render(
      <UserForm
        mode="edit"
        initialData={makeUser({ userId: "u1", role: "admin" })}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={[]}
        isPending={false}
        onSubmit={async () => {}}
        onCancel={() => {}}
      />,
    );
    const roleTrigger = screen.getAllByRole("combobox")[0];
    expect(roleTrigger).toHaveAttribute("data-disabled");
    expect(screen.getByText("form.roleLockedSelf")).toBeInTheDocument();
  });

  it("admin editing another user: role Select is enabled", () => {
    mockCurrentUser = { userId: "u1", role: "admin", tenantId: "t1" };
    mockFeatureRole = "Admin";
    render(
      <UserForm
        mode="edit"
        initialData={makeUser({ userId: "u2", role: "guard" })}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={[]}
        isPending={false}
        onSubmit={async () => {}}
        onCancel={() => {}}
      />,
    );
    const roleTrigger = screen.getAllByRole("combobox")[0];
    expect(roleTrigger).not.toHaveAttribute("data-disabled");
    expect(screen.queryByText("form.roleLockedSelf")).toBeNull();
  });

  it("super_admin editing self: role Select is enabled", () => {
    mockCurrentUser = { userId: "u1", role: "super_admin", tenantId: "t1" };
    mockFeatureRole = "SuperAdmin";
    render(
      <UserForm
        mode="edit"
        initialData={makeUser({ userId: "u1", role: "super_admin" })}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={[]}
        isPending={false}
        onSubmit={async () => {}}
        onCancel={() => {}}
      />,
    );
    const roleTrigger = screen.getAllByRole("combobox")[0];
    expect(roleTrigger).not.toHaveAttribute("data-disabled");
  });

  it("Admin creator: tenant Select is disabled and pre-filled (FR-016)", () => {
    mockCurrentUser = { userId: "u1", role: "admin", tenantId: "t1" };
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
    // Tenant select must be rendered disabled
    const comboboxes = screen.getAllByRole("combobox");
    // The tenant select is the second combobox (after role)
    const tenantSelect = comboboxes[1];
    expect(tenantSelect).toHaveAttribute("data-disabled");
    // Hint text is shown
    expect(screen.getByText("form.tenantLockedHint")).toBeInTheDocument();
  });

  it("admin self-submit does not include role in onSubmit payload", async () => {
    mockCurrentUser = { userId: "u1", role: "admin", tenantId: "t1" };
    mockFeatureRole = "Admin";
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <UserForm
        mode="edit"
        initialData={makeUser({ userId: "u1", role: "admin" })}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={[]}
        isPending={false}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    const form = container.querySelector("form")!;
    form.requestSubmit();
    await new Promise((r) => setTimeout(r, 0));
    expect(onSubmit).toHaveBeenCalled();
    const submitted = onSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect("role" in submitted).toBe(false);
  });
});
