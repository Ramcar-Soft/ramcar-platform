/// <reference types="@testing-library/jest-dom/vitest" />
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

afterEach(() => cleanup());

vi.mock("next-intl", () => ({
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

vi.mock("@ramcar/features/shared/resident-select", () => ({
  ResidentSelect: () => null,
}));

vi.mock("@ramcar/features/shared/visit-person-status-select", () => ({
  VisitPersonStatusSelect: () => null,
}));

vi.mock("@ramcar/features/visitors", () => ({
  ImageSection: () => null,
}));

import { ProviderForm } from "../components/provider-form";

describe("ProviderForm (web) — phone validation", () => {
  it("shows an invalid-phone error on blur", () => {
    render(
      <ProviderForm
        onSave={vi.fn()}
        onCancel={vi.fn()}
        isSaving={false}
      />,
    );
    const phoneInput = screen.getByLabelText(/phone/i) as HTMLInputElement;
    fireEvent.change(phoneInput, { target: { value: "abc" } });
    fireEvent.blur(phoneInput);
    expect(screen.getByText("forms.phoneInvalid")).toBeInTheDocument();
  });

  it("normalizes phone to E.164 on submit", () => {
    const onSave = vi.fn();
    const { container } = render(
      <ProviderForm onSave={onSave} onCancel={vi.fn()} isSaving={false} />,
    );
    fireEvent.change(screen.getByLabelText(/fullName/i), {
      target: { value: "Juan Provider" },
    });
    fireEvent.change(screen.getByLabelText(/phone/i), {
      target: { value: "(555) 123-4567" },
    });
    const form = container.querySelector("form")!;
    form.requestSubmit();
    expect(onSave).toHaveBeenCalledTimes(1);
    const payload = onSave.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.phone).toBe("+525551234567");
  });

  it("does NOT submit when phone is invalid", () => {
    const onSave = vi.fn();
    const { container } = render(
      <ProviderForm onSave={onSave} onCancel={vi.fn()} isSaving={false} />,
    );
    fireEvent.change(screen.getByLabelText(/fullName/i), {
      target: { value: "Juan" },
    });
    fireEvent.change(screen.getByLabelText(/phone/i), {
      target: { value: "123" },
    });
    const form = container.querySelector("form")!;
    form.requestSubmit();
    expect(onSave).not.toHaveBeenCalled();
  });
});
