import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Vehicle } from "@ramcar/shared";
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

describe("VehicleForm — submission forwards vehicle to onSaved", () => {
  it("calls onSaved with the created vehicle object", async () => {
    const user = userEvent.setup();
    const mockVehicle: Vehicle = {
      id: "v-test-1",
      tenantId: "test-tenant-id",
      userId: "test-user",
      visitPersonId: null,
      vehicleType: "car",
      brand: null,
      model: null,
      plate: null,
      color: null,
      notes: null,
      year: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    const onSaved = vi.fn();
    // Pre-fill vehicleType via initialDraft so the Save button is enabled.
    // userId must be a valid UUID so createVehicleSchema passes.
    renderWithHarness(
      <VehicleForm
        userId="00000000-0000-0000-0000-000000000001"
        onSaved={onSaved}
        onCancel={vi.fn()}
        initialDraft={{ vehicleType: "car" }}
      />,
      { transport: { post: async () => mockVehicle as never } },
    );

    await user.click(screen.getByRole("button", { name: "vehicles.form.save" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(mockVehicle));
  });
});

describe("VehicleForm — edit mode", () => {
  const existing: Vehicle = {
    id: "vehicle-1",
    tenantId: "test-tenant-id",
    userId: "user-1",
    visitPersonId: null,
    vehicleType: "car",
    brand: "Toyota",
    model: "Corolla",
    plate: "ABC-123",
    color: "#000000",
    notes: "",
    year: 2020,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };

  it("renders the edit heading and Update submit label", () => {
    renderWithHarness(
      <VehicleForm
        mode="edit"
        vehicle={existing}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText("vehicles.editTitle")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "vehicles.form.update" }),
    ).toBeInTheDocument();
  });

  it("seeds plate from vehicle.plate", () => {
    renderWithHarness(
      <VehicleForm
        mode="edit"
        vehicle={existing}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue("ABC-123")).toBeInTheDocument();
  });

  it("submits via transport.patch to /vehicles/:id with the partial body", async () => {
    const patch = vi.fn().mockResolvedValue({ ...existing, plate: "XYZ-999" });
    const onSaved = vi.fn();

    renderWithHarness(
      <VehicleForm
        mode="edit"
        vehicle={existing}
        onSaved={onSaved}
        onCancel={vi.fn()}
      />,
      { transport: { patch } },
    );

    const plateInput = screen.getByDisplayValue("ABC-123") as HTMLInputElement;
    fireEvent.change(plateInput, { target: { value: "XYZ-999" } });
    fireEvent.click(screen.getByRole("button", { name: "vehicles.form.update" }));

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patch.mock.calls[0][0]).toBe("/vehicles/vehicle-1");
    expect(patch.mock.calls[0][1]).toMatchObject({ plate: "XYZ-999" });
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it("does NOT include ownerType / userId / visitPersonId in the patch body", async () => {
    const patch = vi.fn().mockResolvedValue(existing);
    renderWithHarness(
      <VehicleForm
        mode="edit"
        vehicle={existing}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
      { transport: { patch } },
    );

    fireEvent.click(screen.getByRole("button", { name: "vehicles.form.update" }));
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    const body = patch.mock.calls[0][1] as Record<string, unknown>;
    expect(body).not.toHaveProperty("ownerType");
    expect(body).not.toHaveProperty("userId");
    expect(body).not.toHaveProperty("visitPersonId");
    expect(body).not.toHaveProperty("tenantId");
  });
});
