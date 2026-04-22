import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithHarness } from "../../test/harness";
import { VehicleModelSelect } from "./vehicle-model-select";

afterEach(() => cleanup());

const SEARCH_PLACEHOLDER = "vehicles.model.searchPlaceholder";

describe("VehicleModelSelect — M1: disabled when brand is null", () => {
  it("renders a disabled trigger when brand is null", () => {
    renderWithHarness(
      <VehicleModelSelect brand={null} value={null} onChange={() => {}} />,
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("shows disabled placeholder text when brand is null", () => {
    renderWithHarness(
      <VehicleModelSelect brand={null} value={null} onChange={() => {}} />,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("vehicles.model.disabled");
  });
});

describe("VehicleModelSelect — M2: scoped to brand", () => {
  it("enables when brand is set", () => {
    renderWithHarness(
      <VehicleModelSelect brand="Nissan" value={null} onChange={() => {}} />,
    );
    expect(screen.getByRole("combobox")).not.toBeDisabled();
  });

  it("M3: shows Versa when typing 'ver' with Nissan brand", async () => {
    const user = userEvent.setup();
    renderWithHarness(
      <VehicleModelSelect brand="Nissan" value={null} onChange={() => {}} />,
    );
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "ver");
    expect(await screen.findByText("Versa")).toBeInTheDocument();
  });

  it("does not show models from other brands", async () => {
    const user = userEvent.setup();
    renderWithHarness(
      <VehicleModelSelect brand="Nissan" value={null} onChange={() => {}} />,
    );
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "jetta");
    expect(screen.queryByText("Jetta")).not.toBeInTheDocument();
  });
});

describe("VehicleModelSelect — M4: commits canonical on select", () => {
  it("calls onChange with canonical model name", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithHarness(
      <VehicleModelSelect brand="Nissan" value={null} onChange={onChange} />,
    );
    await user.click(screen.getByRole("combobox"));
    const versa = await screen.findByText("Versa");
    await user.click(versa);
    expect(onChange).toHaveBeenCalledWith("Versa");
  });
});

describe("VehicleModelSelect — M5/M6: free-text brand fallback (US2)", () => {
  it("M5: shows fallback row when brand is a free-text (non-dataset) value and user types", async () => {
    const user = userEvent.setup();
    renderWithHarness(
      <VehicleModelSelect brand="Gumpert" value={null} onChange={() => {}} />,
    );
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "Apollo");
    const fallback = await screen.findByTestId("model-fallback-row");
    expect(fallback).toBeInTheDocument();
  });

  it("M6: selecting model fallback commits verbatim typed text", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithHarness(
      <VehicleModelSelect brand="Gumpert" value={null} onChange={onChange} />,
    );
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "Apollo");
    const fallback = await screen.findByTestId("model-fallback-row");
    await user.click(fallback);
    expect(onChange).toHaveBeenCalledWith("Apollo");
  });
});

describe("VehicleModelSelect — M8: previous value display", () => {
  it("displays committed model value on trigger", () => {
    renderWithHarness(
      <VehicleModelSelect brand="Nissan" value="Versa" onChange={() => {}} />,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("Versa");
  });

  it("FR-019: renders pre-dataset free-text model without throwing", () => {
    renderWithHarness(
      <VehicleModelSelect brand="Nissan" value="OldLegacyModel" onChange={() => {}} />,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("OldLegacyModel");
  });
});
