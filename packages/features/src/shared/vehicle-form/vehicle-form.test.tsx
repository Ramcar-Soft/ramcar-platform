import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithHarness } from "../../test/harness";
import { VehicleForm } from "./vehicle-form";

afterEach(() => cleanup());

const BRAND_ARIA = "vehicles.brand.ariaLabel";
const MODEL_ARIA = "vehicles.model.ariaLabel";
const BRAND_SEARCH_PH = "vehicles.brand.searchPlaceholder";
const MODEL_SEARCH_PH = "vehicles.model.searchPlaceholder";

function renderForm() {
  const onSaved = vi.fn();
  const onCancel = vi.fn();
  return renderWithHarness(
    <VehicleForm userId="test-user" onSaved={onSaved} onCancel={onCancel} />,
  );
}

describe("VehicleForm — brand/model autocomplete integration (US1)", () => {
  it("renders brand and model labels", () => {
    renderForm();
    expect(screen.getByText("vehicles.brand.label")).toBeInTheDocument();
    expect(screen.getByText("vehicles.model.label")).toBeInTheDocument();
  });

  it("model combobox is disabled until brand is selected", () => {
    renderForm();
    expect(screen.getByRole("combobox", { name: MODEL_ARIA })).toBeDisabled();
  });

  it("model combobox enables after brand is selected", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("combobox", { name: BRAND_ARIA }));
    await user.type(screen.getByPlaceholderText(BRAND_SEARCH_PH), "Ni");
    await user.click(await screen.findByText("Nissan"));
    expect(screen.getByRole("combobox", { name: MODEL_ARIA })).not.toBeDisabled();
  });

  it("FR-013: changing brand clears the previously committed model", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("combobox", { name: BRAND_ARIA }));
    await user.type(screen.getByPlaceholderText(BRAND_SEARCH_PH), "Ni");
    await user.click(await screen.findByText("Nissan"));

    await user.click(screen.getByRole("combobox", { name: MODEL_ARIA }));
    await user.click(await screen.findByText("Versa"));

    expect(screen.getByRole("combobox", { name: MODEL_ARIA })).toHaveTextContent("Versa");

    await user.click(screen.getByRole("combobox", { name: BRAND_ARIA }));
    await user.type(screen.getByPlaceholderText(BRAND_SEARCH_PH), "To");
    await user.click(await screen.findByText("Toyota"));

    expect(screen.getByRole("combobox", { name: MODEL_ARIA })).not.toHaveTextContent("Versa");
  });
});

describe("VehicleForm — free-text fallback (US2)", () => {
  it("FR-007: free-text brand can be committed via fallback", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("combobox", { name: BRAND_ARIA }));
    await user.type(screen.getByPlaceholderText(BRAND_SEARCH_PH), "Gumpert");
    await user.click(await screen.findByTestId("brand-fallback-row"));
    expect(screen.getByRole("combobox", { name: BRAND_ARIA })).toHaveTextContent("Gumpert");
  });

  it("FR-008: free-text model can be committed after free-text brand", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("combobox", { name: BRAND_ARIA }));
    await user.type(screen.getByPlaceholderText(BRAND_SEARCH_PH), "Gumpert");
    await user.click(await screen.findByTestId("brand-fallback-row"));

    await user.click(screen.getByRole("combobox", { name: MODEL_ARIA }));
    await user.type(screen.getByPlaceholderText(MODEL_SEARCH_PH), "Apollo");
    await user.click(await screen.findByTestId("model-fallback-row"));

    expect(screen.getByRole("combobox", { name: MODEL_ARIA })).toHaveTextContent("Apollo");
  });
});

describe("VehicleForm — year field (US4)", () => {
  it("renders year input", () => {
    renderForm();
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
  });

  it("accepts a valid year via fireEvent", () => {
    renderForm();
    const yearInput = screen.getByRole("spinbutton");
    fireEvent.change(yearInput, { target: { value: "2019" } });
    expect(yearInput).toHaveValue(2019);
  });

  it("leaves year blank (null) by default", () => {
    renderForm();
    expect(screen.getByRole("spinbutton")).toHaveValue(null);
  });
});
