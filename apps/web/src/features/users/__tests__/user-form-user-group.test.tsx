/// <reference types="@testing-library/jest-dom/vitest" />
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { ExtendedUserProfile, UserGroup } from "../types";

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

vi.mock("@ramcar/store", () => ({
  useAppStore: (selector: (s: unknown) => unknown) =>
    selector({ user: { userId: "uX", role: "super_admin", tenantId: "t1" } }),
}));

import { UserForm } from "../components/user-form";

function makeUser(overrides: Partial<ExtendedUserProfile> = {}): ExtendedUserProfile {
  return {
    id: "p1", userId: "u1", tenantId: "t1", tenantName: "T",
    tenantIds: ["t1"],
    fullName: "Target", email: "t@x.com", role: "guard", address: "a",
    username: "target", phone: "+525551234567", phoneType: null, status: "active",
    userGroupIds: [], userGroups: [], observations: null,
    createdAt: "2026-01-01", updatedAt: "2026-01-01",
    canEdit: true, canDeactivate: true,
    ...overrides,
  };
}

const groups: UserGroup[] = [
  { id: "g1", name: "Admin" },
  { id: "g2", name: "Pool" },
];

describe("UserForm user group single-select", () => {
  it("renders a single Select trigger for the group (no checkboxes)", () => {
    render(
      <UserForm
        mode="edit"
        initialData={makeUser({ userGroupIds: ["g1"] })}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={groups}
        isPending={false}
        onSubmit={async () => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.getByText("form.userGroup")).toBeInTheDocument();
  });

  it("pre-selects the first userGroupId (displays its name)", () => {
    render(
      <UserForm
        mode="edit"
        initialData={makeUser({ userGroupIds: ["g2"] })}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={groups}
        isPending={false}
        onSubmit={async () => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getAllByText("Pool").length).toBeGreaterThan(0);
  });

  it("users with multiple existing groups pre-select the first", () => {
    render(
      <UserForm
        mode="edit"
        initialData={makeUser({ userGroupIds: ["g1", "g2"] })}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={groups}
        isPending={false}
        onSubmit={async () => {}}
        onCancel={() => {}}
      />,
    );
    const adminEls = screen.getAllByText("Admin");
    expect(adminEls.length).toBeGreaterThan(0);
    const poolInValue = screen.queryAllByText("Pool").find(
      (el) => el.getAttribute("data-slot") === "select-value",
    );
    expect(poolInValue).toBeUndefined();
  });

  it("submitting with no selection sends userGroupIds as []", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <UserForm
        mode="edit"
        initialData={makeUser({ userGroupIds: [] })}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={groups}
        isPending={false}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    const form = container.querySelector("form")!;
    fireEvent.submit(form);
    await new Promise((r) => setTimeout(r, 0));
    expect(onSubmit).toHaveBeenCalled();
    const payload = onSubmit.mock.calls[0][0] as { userGroupIds: string[] };
    expect(payload.userGroupIds).toEqual([]);
  });

  it("submitting with a pre-selected group sends userGroupIds as [id]", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <UserForm
        mode="edit"
        initialData={makeUser({ userGroupIds: ["g2"] })}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={groups}
        isPending={false}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    const form = container.querySelector("form")!;
    fireEvent.submit(form);
    await new Promise((r) => setTimeout(r, 0));
    expect(onSubmit).toHaveBeenCalled();
    const payload = onSubmit.mock.calls[0][0] as { userGroupIds: string[] };
    expect(payload.userGroupIds).toEqual(["g2"]);
  });
});
