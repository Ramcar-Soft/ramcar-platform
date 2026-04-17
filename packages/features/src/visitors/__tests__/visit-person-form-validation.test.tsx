import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithHarness } from "../../test/harness";
import { VisitPersonForm } from "../components/visit-person-form";

const defaultProps = {
  onSave: vi.fn(),
  onCancel: vi.fn(),
  isSaving: false,
};

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
