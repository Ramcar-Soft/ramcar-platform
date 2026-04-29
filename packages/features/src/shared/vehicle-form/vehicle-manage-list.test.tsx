import { describe, it, expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { renderWithHarness } from "../../test/harness";
import { VehicleManageList } from "./vehicle-manage-list";
import type { Vehicle } from "@ramcar/shared";

afterEach(() => cleanup());

const knownBrandVehicle: Vehicle = {
  id: "v-1",
  tenantId: "t-1",
  userId: "u-1",
  visitPersonId: null,
  vehicleType: "car",
  brand: "Nissan",
  model: "Versa",
  year: null,
  plate: "ABC-123",
  color: null,
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const unknownBrandVehicle: Vehicle = {
  id: "v-2",
  tenantId: "t-1",
  userId: "u-1",
  visitPersonId: null,
  vehicleType: "car",
  brand: "Made-Up Brand",
  model: null,
  year: null,
  plate: "XYZ-999",
  color: null,
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const normalizedKnownBrandVehicle: Vehicle = {
  ...unknownBrandVehicle,
  id: "v-3",
  brand: "  TOYOTA  ",
  plate: "TOY-001",
};

describe("VehicleManageList — US2 logo integration", () => {
  it("known-brand row renders an img (logo present)", () => {
    const { container } = renderWithHarness(
      <VehicleManageList
        residentId="r-1"
        vehicles={[knownBrandVehicle]}
        isLoading={false}
        onEdit={() => {}}
        onClose={() => {}}
      />
    );
    const items = container.querySelectorAll("li");
    expect(items.length).toBe(1);
    expect(items[0].querySelector("img")).toBeInTheDocument();
  });

  it("free-text / unknown brand row renders zero img elements", () => {
    const { container } = renderWithHarness(
      <VehicleManageList
        residentId="r-1"
        vehicles={[unknownBrandVehicle]}
        isLoading={false}
        onEdit={() => {}}
        onClose={() => {}}
      />
    );
    const items = container.querySelectorAll("li");
    expect(items.length).toBe(1);
    expect(items[0].querySelectorAll("img")).toHaveLength(0);
  });

  it("both rows have consistent structure (logo span present in both)", () => {
    const { container } = renderWithHarness(
      <VehicleManageList
        residentId="r-1"
        vehicles={[knownBrandVehicle, unknownBrandVehicle]}
        isLoading={false}
        onEdit={() => {}}
        onClose={() => {}}
      />
    );
    const items = container.querySelectorAll("li");
    expect(items.length).toBe(2);

    const knownItem = items[0];
    const unknownItem = items[1];

    expect(knownItem.querySelector("img")).toBeInTheDocument();
    expect(unknownItem.querySelectorAll("img")).toHaveLength(0);

    // Both rows have the brand logo tile span (flex-none rounded)
    expect(knownItem.querySelector("[aria-hidden='true']")).toBeInTheDocument();
    expect(unknownItem.querySelector("[aria-hidden='true']")).toBeInTheDocument();
  });

  it("US3: whitespace/uppercase brand normalizes to known-brand logo", () => {
    const { container } = renderWithHarness(
      <VehicleManageList
        residentId="r-1"
        vehicles={[normalizedKnownBrandVehicle]}
        isLoading={false}
        onEdit={() => {}}
        onClose={() => {}}
      />
    );
    const items = container.querySelectorAll("li");
    expect(items[0].querySelector("img")).toBeInTheDocument();
  });
});
