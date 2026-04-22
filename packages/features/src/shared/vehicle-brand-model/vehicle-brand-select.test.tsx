import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithHarness } from "../../test/harness";
import { VehicleBrandSelect } from "./vehicle-brand-select";

afterEach(() => cleanup());

const SEARCH_PLACEHOLDER = "vehicles.brand.searchPlaceholder";

describe("VehicleBrandSelect — trigger rendering", () => {
  it("B8: shows placeholder key when value is null", () => {
    renderWithHarness(<VehicleBrandSelect value={null} onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("vehicles.brand.placeholder");
  });

  it("B8: displays previously committed brand value as current selection", () => {
    renderWithHarness(<VehicleBrandSelect value="Nissan" onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Nissan");
  });

  it("B8: displays legacy free-text value without throwing", () => {
    renderWithHarness(<VehicleBrandSelect value="Gumpert" onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Gumpert");
  });

  it("respects the disabled prop", () => {
    renderWithHarness(<VehicleBrandSelect value={null} onChange={() => {}} disabled />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("applies the ariaLabel prop", () => {
    renderWithHarness(
      <VehicleBrandSelect value={null} onChange={() => {}} ariaLabel="Brand picker" />,
    );
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-label", "Brand picker");
  });
});

describe("VehicleBrandSelect — B1: opens on click", () => {
  it("opens popover when trigger is clicked", async () => {
    const user = userEvent.setup();
    renderWithHarness(<VehicleBrandSelect value={null} onChange={() => {}} />);
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toBeInTheDocument();
  });
});

describe("VehicleBrandSelect — B3: fuzzy brand match", () => {
  it("shows Nissan when user types 'nis'", async () => {
    const user = userEvent.setup();
    renderWithHarness(<VehicleBrandSelect value={null} onChange={() => {}} />);
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "nis");
    expect(await screen.findByText("Nissan")).toBeInTheDocument();
  });
});

describe("VehicleBrandSelect — B4: commits canonical spelling on select", () => {
  it("calls onChange with canonical brand name on selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithHarness(<VehicleBrandSelect value={null} onChange={onChange} />);
    await user.click(screen.getByRole("combobox"));
    const nissanItem = await screen.findByText("Nissan");
    await user.click(nissanItem);
    expect(onChange).toHaveBeenCalledWith("Nissan");
  });
});

describe("VehicleBrandSelect — B5/B6: free-text fallback (US2)", () => {
  it("B5: shows fallback row when typed text doesn't match any dataset brand", async () => {
    const user = userEvent.setup();
    renderWithHarness(<VehicleBrandSelect value={null} onChange={() => {}} />);
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "Gumpert");
    expect(await screen.findByTestId("brand-fallback-row")).toBeInTheDocument();
  });

  it("B6: selecting fallback row commits verbatim typed text", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithHarness(<VehicleBrandSelect value={null} onChange={onChange} />);
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "Gumpert");
    const fallback = await screen.findByTestId("brand-fallback-row");
    await user.click(fallback);
    expect(onChange).toHaveBeenCalledWith("Gumpert");
  });

  it("B11: legacy free-text value renders as current selection on reopen", () => {
    renderWithHarness(<VehicleBrandSelect value="UnknownBrand" onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("UnknownBrand");
  });
});
