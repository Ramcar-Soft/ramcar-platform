import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

afterEach(() => cleanup());
import { renderWithHarness } from "../../test/harness";
import { VisitPersonForm } from "../components/visit-person-form";

const defaultProps = {
  onSave: vi.fn(),
  onCancel: vi.fn(),
  isSaving: false,
};

import React from "react";

describe("VisitPersonForm validation", () => {
  it("keeps submit button disabled when fullName is empty", () => {
    renderWithHarness(<VisitPersonForm {...defaultProps} />);
    const submitButtons = screen.getAllByRole("button").filter(
      (b) => b.getAttribute("type") === "submit",
    );
    expect(submitButtons[0]).toBeDisabled();
  });

  it("keeps submit button disabled when fullName is only whitespace", async () => {
    renderWithHarness(<VisitPersonForm {...defaultProps} />);

    const inputs = screen.getAllByPlaceholderText("visitPersons.form.fullName");
    fireEvent.change(inputs[0], { target: { value: "   " } });

    await waitFor(() => {
      const submitButtons = screen.getAllByRole("button").filter(
        (b) => b.getAttribute("type") === "submit",
      );
      expect(submitButtons[0]).toBeDisabled();
    });
  });

  it("enables submit button for valid fullName (min 1 non-whitespace char)", async () => {
    renderWithHarness(<VisitPersonForm {...defaultProps} />);

    const inputs = screen.getAllByPlaceholderText("visitPersons.form.fullName");
    fireEvent.change(inputs[0], { target: { value: "A" } });

    await waitFor(() => {
      const submitButtons = screen.getAllByRole("button").filter(
        (b) => b.getAttribute("type") === "submit",
      );
      expect(submitButtons[0]).not.toBeDisabled();
    });
  });
});

describe("VisitPersonForm — phone validation", () => {
  it("shows invalid-phone error on blur", async () => {
    renderWithHarness(<VisitPersonForm {...defaultProps} />);
    const phoneInput = screen.getByLabelText(/phone/i) as HTMLInputElement;
    fireEvent.change(phoneInput, { target: { value: "abc" } });
    fireEvent.blur(phoneInput);
    await waitFor(() => {
      expect(screen.getByText("forms.phoneInvalid")).toBeInTheDocument();
    });
  });

  it("normalizes phone to E.164 on submit", async () => {
    const onSave = vi.fn();
    const { container } = renderWithHarness(
      <VisitPersonForm {...defaultProps} onSave={onSave} />,
    );
    fireEvent.change(
      screen.getAllByPlaceholderText("visitPersons.form.fullName")[0],
      { target: { value: "Jane" } },
    );
    fireEvent.change(screen.getByLabelText(/phone/i), {
      target: { value: "(555) 123-4567" },
    });
    const form = container.querySelector("form")!;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
    const payload = onSave.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.phone).toBe("+525551234567");
  });
});
