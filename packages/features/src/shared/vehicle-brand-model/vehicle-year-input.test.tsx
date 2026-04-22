import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, cleanup, fireEvent } from "@testing-library/react";
import { render } from "@testing-library/react";
import { VehicleYearInput } from "./vehicle-year-input";

afterEach(() => cleanup());

describe("VehicleYearInput", () => {
  it("Y1: empty input renders with null value", () => {
    render(<VehicleYearInput value={null} onChange={() => {}} />);
    expect(screen.getByRole("spinbutton")).toHaveValue(null);
  });

  it("Y1: clearing input calls onChange(null)", () => {
    const onChange = vi.fn();
    render(<VehicleYearInput value={2019} onChange={onChange} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("Y2: entering 2019 calls onChange(2019)", () => {
    const onChange = vi.fn();
    render(<VehicleYearInput value={null} onChange={onChange} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "2019" } });
    expect(onChange).toHaveBeenLastCalledWith(2019);
  });

  it("Y4: renders with correct min and max attributes", () => {
    render(<VehicleYearInput value={null} onChange={() => {}} />);
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("min", "1960");
    const max = parseInt(input.getAttribute("max") ?? "0", 10);
    expect(max).toBeGreaterThanOrEqual(new Date().getFullYear());
  });

  it("Y5: disabled prop propagates to the input", () => {
    render(<VehicleYearInput value={null} onChange={() => {}} disabled />);
    expect(screen.getByRole("spinbutton")).toBeDisabled();
  });

  it("renders with a provided numeric value", () => {
    render(<VehicleYearInput value={2022} onChange={() => {}} />);
    expect(screen.getByRole("spinbutton")).toHaveValue(2022);
  });
});
