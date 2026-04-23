/// <reference types="@testing-library/jest-dom/vitest" />
import React from "react";
import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

beforeAll(() => {
  // jsdom doesn't implement ResizeObserver or scrollIntoView, which
  // Radix/cmdk rely on.
  if (typeof globalThis.ResizeObserver === "undefined") {
    class RO {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    (globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver =
      RO;
  }
  if (!(Element.prototype as unknown as { scrollIntoView?: () => void }).scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
});

afterEach(() => cleanup());

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import { TenantMultiSelect } from "../tenant-multi-select";

const OPTIONS = [
  { id: "t1", name: "Tenant One" },
  { id: "t2", name: "Tenant Two" },
  { id: "t3", name: "Tenant Three" },
];

describe("TenantMultiSelect", () => {
  it("renders a chip for every selected tenant", () => {
    render(
      <TenantMultiSelect
        value={["t1", "t2"]}
        primary="t1"
        onChange={vi.fn()}
        options={OPTIONS}
      />,
    );
    expect(screen.getByTestId("tenant-chip-t1")).toBeInTheDocument();
    expect(screen.getByTestId("tenant-chip-t2")).toBeInTheDocument();
    expect(screen.queryByTestId("tenant-chip-t3")).toBeNull();
  });

  it("radio click on a non-primary chip fires onChange with a new primary", () => {
    const onChange = vi.fn();
    render(
      <TenantMultiSelect
        value={["t1", "t2"]}
        primary="t1"
        onChange={onChange}
        options={OPTIONS}
      />,
    );

    const chipTwo = screen.getByTestId("tenant-chip-t2");
    const radio = chipTwo.querySelector(
      'input[type="radio"]',
    ) as HTMLInputElement;
    fireEvent.click(radio);

    expect(onChange).toHaveBeenCalledWith(["t1", "t2"], "t2");
  });

  it("remove button on the primary chip reassigns primary to the first remaining tenant", () => {
    const onChange = vi.fn();
    render(
      <TenantMultiSelect
        value={["t1", "t2", "t3"]}
        primary="t1"
        onChange={onChange}
        options={OPTIONS}
      />,
    );

    const chipOne = screen.getByTestId("tenant-chip-t1");
    const removeBtn = chipOne.querySelector(
      'button[aria-label="tenantRemove"]',
    ) as HTMLButtonElement;
    fireEvent.click(removeBtn);

    expect(onChange).toHaveBeenCalledWith(["t2", "t3"], "t2");
  });

  it("allowedIds filters the option list (admin actor scope)", () => {
    render(
      <TenantMultiSelect
        value={[]}
        primary=""
        onChange={vi.fn()}
        options={OPTIONS}
        allowedIds={["t1"]}
      />,
    );

    // Open the popover
    fireEvent.click(screen.getByRole("combobox"));

    expect(screen.getByText("Tenant One")).toBeInTheDocument();
    expect(screen.queryByText("Tenant Two")).toBeNull();
    expect(screen.queryByText("Tenant Three")).toBeNull();
  });

  it("renders the error message when passed an error prop (zero-selected case)", () => {
    render(
      <TenantMultiSelect
        value={[]}
        primary=""
        onChange={vi.fn()}
        options={OPTIONS}
        error="validation.atLeastOneTenant"
      />,
    );
    expect(
      screen.getByText("validation.atLeastOneTenant"),
    ).toBeInTheDocument();
  });
});
