import { describe, it, expect, afterEach } from "vitest";
import { screen, cleanup, waitFor } from "@testing-library/react";
import type { Vehicle } from "@ramcar/shared";
import { renderWithHarness } from "../../test/harness";
import { VisitPersonAccessEventForm } from "./visit-person-access-event-form";

afterEach(() => cleanup());

const makeVehicle = (id: string): Vehicle => ({
  id,
  tenantId: "t1",
  userId: null,
  visitPersonId: "vp1",
  vehicleType: "car",
  brand: "Toyota",
  model: null,
  plate: `PLATE-${id}`,
  color: null,
  notes: null,
  year: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
});

const noop = async () => {};

describe("VisitPersonAccessEventForm — auto-select rule", () => {
  it("auto-selects the vehicle when there is exactly one", async () => {
    const vehicles = [makeVehicle("v1")];
    renderWithHarness(
      <VisitPersonAccessEventForm
        vehicles={vehicles}
        onSave={noop}
        onCancel={() => {}}
        isSaving={false}
      />,
    );
    // Save button should become enabled once auto-select runs (vehicleId is set)
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "accessEvents.form.save" })).not.toBeDisabled(),
    );
  });

  it("does NOT auto-select when there are multiple vehicles", async () => {
    const vehicles = [makeVehicle("v1"), makeVehicle("v2"), makeVehicle("v3")];
    renderWithHarness(
      <VisitPersonAccessEventForm
        vehicles={vehicles}
        onSave={noop}
        onCancel={() => {}}
        isSaving={false}
      />,
    );
    // Save button stays disabled — no auto-selection for multiple vehicles
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "accessEvents.form.save" })).toBeDisabled(),
    );
  });

  it("seeds vehicleId from initialVehicleId", async () => {
    const vehicles = [makeVehicle("v1"), makeVehicle("v2")];
    renderWithHarness(
      <VisitPersonAccessEventForm
        vehicles={vehicles}
        onSave={noop}
        onCancel={() => {}}
        isSaving={false}
        initialVehicleId="v1"
      />,
    );
    // Save should be enabled immediately because vehicleId is seeded
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "accessEvents.form.save" })).not.toBeDisabled(),
    );
  });

  it("Save is disabled in vehicle mode when no vehicle is selected", () => {
    renderWithHarness(
      <VisitPersonAccessEventForm
        vehicles={[]}
        onSave={noop}
        onCancel={() => {}}
        isSaving={false}
      />,
    );
    expect(screen.getByRole("button", { name: "accessEvents.form.save" })).toBeDisabled();
  });
});
