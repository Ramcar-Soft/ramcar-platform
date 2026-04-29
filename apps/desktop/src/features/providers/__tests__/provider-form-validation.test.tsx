/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

afterEach(() => cleanup());

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@ramcar/features/adapters", () => ({
  useRole: () => ({ role: "Admin", tenantId: "", userId: "" }),
}));

vi.mock("@ramcar/features/shared/visit-person-status-select", () => ({
  VisitPersonStatusSelect: () => null,
}));

vi.mock("@ramcar/features/visitors", () => ({
  ImageSection: () => null,
}));

import { ProviderForm } from "../components/provider-form";

describe("ProviderForm (desktop) — phone validation", () => {
  it("shows invalid-phone error on blur", () => {
    render(
      <ProviderForm onSave={vi.fn()} onCancel={vi.fn()} isSaving={false} />,
    );
    const phoneInput = screen.getByLabelText(/phone/i) as HTMLInputElement;
    fireEvent.change(phoneInput, { target: { value: "abc" } });
    fireEvent.blur(phoneInput);
    expect(screen.getByText("forms.phoneInvalid")).toBeInTheDocument();
  });

  it("normalizes phone on submit", () => {
    const onSave = vi.fn();
    const { container } = render(
      <ProviderForm onSave={onSave} onCancel={vi.fn()} isSaving={false} />,
    );
    fireEvent.change(screen.getByLabelText(/fullName/i), { target: { value: "Juan" } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "(555) 123-4567" } });
    container.querySelector("form")!.requestSubmit();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect((onSave.mock.calls[0][0] as Record<string, unknown>).phone).toBe("+525551234567");
  });

  it("blocks submit with invalid phone", () => {
    const onSave = vi.fn();
    const { container } = render(
      <ProviderForm onSave={onSave} onCancel={vi.fn()} isSaving={false} />,
    );
    fireEvent.change(screen.getByLabelText(/fullName/i), { target: { value: "Juan" } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "123" } });
    container.querySelector("form")!.requestSubmit();
    expect(onSave).not.toHaveBeenCalled();
  });
});
