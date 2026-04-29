/// <reference types="@testing-library/jest-dom/vitest" />
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { ExtendedUserProfile } from "../types";

afterEach(() => cleanup());

vi.mock("next-intl", () => ({
  // Echo the namespace + key so `tForms("phoneInvalid")` renders as "forms.phoneInvalid".
  useTranslations: (ns?: string) => (key: string) =>
    ns ? `${ns}.${key}` : key,
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
    selector({
      user: { userId: "u1", role: "super_admin", tenantId: "t1" },
      tenantIds: ["t1"],
      activeTenantId: "t1",
    }),
}));

vi.mock("@ramcar/features/adapters", () => ({
  useRole: () => ({ role: "SuperAdmin", tenantId: "t1", userId: "u1" }),
}));

vi.mock("@ramcar/features", () => ({
  canEditUserTenantField: () => true,
}));

import { UserForm } from "../components/user-form";

function makeUser(overrides: Partial<ExtendedUserProfile> = {}): ExtendedUserProfile {
  return {
    id: "p1",
    userId: "u1",
    tenantId: "t1",
    tenantName: "T",
    tenantIds: ["t1"],
    fullName: "John",
    email: "john@example.com",
    role: "guard",
    address: "addr",
    username: "johndoe",
    phone: "",
    phoneType: null,
    status: "active",
    userGroupIds: [],
    userGroups: [],
    observations: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    canEdit: true,
    canDeactivate: false,
    ...overrides,
  };
}

// All format-validation tests run in edit mode with a super_admin profile so the
// role dropdown does not need to be driven through the Radix combobox.
const baseProfile = makeUser({
  userId: "u1",
  role: "super_admin",
  username: "",
  phone: "",
});

describe("UserForm — format validation", () => {
  it("soft-filters disallowed characters from username input", () => {
    render(
      <UserForm
        mode="edit"
        initialData={baseProfile}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={[]}
        isPending={false}
        onSubmit={async () => {}}
        onCancel={() => {}}
      />,
    );
    const input = screen.getByLabelText(/form\.username/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "juan@perez!" } });
    expect(input.value).toBe("juanperez");
  });

  it("shows an invalid-phone error on blur", () => {
    render(
      <UserForm
        mode="edit"
        initialData={baseProfile}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={[]}
        isPending={false}
        onSubmit={async () => {}}
        onCancel={() => {}}
      />,
    );
    const input = screen.getByLabelText(/form\.phone(?!Type)/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.blur(input);
    expect(screen.getByText("forms.phoneInvalid")).toBeInTheDocument();
  });

  it("normalizes phone to E.164 on submit", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <UserForm
        mode="edit"
        initialData={baseProfile}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={[]}
        isPending={false}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText(/form\.email/i), {
      target: { value: "Jane@Example.COM" },
    });
    fireEvent.change(screen.getByLabelText(/form\.phone(?!Type)/i), {
      target: { value: "(555) 123-4567" },
    });
    const form = container.querySelector("form")!;
    form.requestSubmit();
    await new Promise((r) => setTimeout(r, 0));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.phone).toBe("+525551234567");
    expect(payload.email).toBe("jane@example.com");
  });

  it("does NOT overwrite username with phone on submit (regression guard)", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <UserForm
        mode="edit"
        initialData={baseProfile}
        tenants={[{ id: "t1", name: "T" }]}
        userGroups={[]}
        isPending={false}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText(/form\.phone(?!Type)/i), {
      target: { value: "5551234567" },
    });
    fireEvent.change(screen.getByLabelText(/form\.username/i), {
      target: { value: "janedoe" },
    });
    const form = container.querySelector("form")!;
    form.requestSubmit();
    await new Promise((r) => setTimeout(r, 0));
    const payload = onSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.username).toBe("janedoe");
    expect(payload.username).not.toBe(payload.phone);
  });

  it("admin/guard payload sends tenant_ids as length-1 array + primary_tenant_id (FR-022)", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const guardProfile = makeUser({ role: "guard", tenantId: "t1" });
    const { container } = render(
      <UserForm
        mode="edit"
        initialData={guardProfile}
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
    const payload = onSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect(Array.isArray(payload.tenant_ids)).toBe(true);
    expect((payload.tenant_ids as string[]).length).toBe(1);
    expect(payload.primary_tenant_id).toBe((payload.tenant_ids as string[])[0]);
    expect(payload.tenantId).toBeUndefined();
  });

  it("submits with email: undefined when the email field is left blank", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const profileWithoutEmail = makeUser({
      role: "super_admin",
      email: null,
      username: "",
      phone: "",
    });
    const { container } = render(
      <UserForm
        mode="edit"
        initialData={profileWithoutEmail}
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
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.email).toBeUndefined();
  });

  it("missing tenant fails validation for guard role", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const guardProfile = makeUser({ role: "guard", tenantId: "" });
    const { container } = render(
      <UserForm
        mode="edit"
        initialData={guardProfile}
        tenants={[]}
        userGroups={[]}
        isPending={false}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    const form = container.querySelector("form")!;
    form.requestSubmit();
    await new Promise((r) => setTimeout(r, 0));
    // Validation should fail; onSubmit not called
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/users\.validation\.tenantRequired/i)).toBeInTheDocument();
  });
});
