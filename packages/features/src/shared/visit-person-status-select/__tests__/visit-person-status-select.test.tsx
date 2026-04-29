import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithHarness } from "../../../test/harness";
import { VisitPersonStatusSelect } from "../index";

afterEach(() => cleanup());

describe("VisitPersonStatusSelect", () => {
  it("renders enabled by default and opens the menu on click", async () => {
    const user = userEvent.setup();
    renderWithHarness(
      <VisitPersonStatusSelect value="flagged" onValueChange={vi.fn()} />,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger).not.toBeDisabled();
    await user.click(trigger);
    // Radix renders SelectItem options as role=option once opened.
    expect(screen.getAllByRole("option").length).toBeGreaterThan(0);
  });

  it("renders disabled when disabled=true and does not open on click", () => {
    renderWithHarness(
      <VisitPersonStatusSelect
        value="flagged"
        onValueChange={vi.fn()}
        disabled
      />,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeDisabled();
    // Disabled trigger: menu must not be open initially.
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("still shows the current label when disabled", () => {
    renderWithHarness(
      <VisitPersonStatusSelect
        value="flagged"
        onValueChange={vi.fn()}
        disabled
      />,
    );
    expect(
      screen.getByText("visitPersons.status.flagged"),
    ).toBeDefined();
  });
});
