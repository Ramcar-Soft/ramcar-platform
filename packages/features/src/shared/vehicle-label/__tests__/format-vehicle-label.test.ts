import { describe, it, expect } from "vitest";
import { formatVehicleLabel } from "../format-vehicle-label";

describe("formatVehicleLabel", () => {
  it("joins brand, model, and plate when all three are present", () => {
    expect(
      formatVehicleLabel({
        brand: "Toyota",
        model: "Avanza",
        plate: "HASD-123",
        vehicleType: "car",
      }),
    ).toBe("Toyota Avanza — HASD-123");
  });

  it("returns only the brand when model and plate are null", () => {
    expect(
      formatVehicleLabel({
        brand: "Toyota",
        model: null,
        plate: null,
        vehicleType: "car",
      }),
    ).toBe("Toyota");
  });

  it("falls back to vehicleType when brand, model, and plate are all empty", () => {
    expect(
      formatVehicleLabel({
        brand: null,
        model: null,
        plate: null,
        vehicleType: "motorcycle",
      }),
    ).toBe("motorcycle");
  });

  it("joins brand and model with no trailing em-dash when plate is null", () => {
    expect(
      formatVehicleLabel({
        brand: "Honda",
        model: "Civic",
        plate: null,
        vehicleType: "car",
      }),
    ).toBe("Honda Civic");
  });

  it("accepts a structurally-compatible input that carries extra fields and does not emit the color", () => {
    const input = {
      brand: "Toyota",
      model: "Avanza",
      plate: "HASD-123",
      vehicleType: "car",
      color: "#FFFFFF",
    };
    const label = formatVehicleLabel(input);
    expect(label).toBe("Toyota Avanza — HASD-123");
    expect(label).not.toContain("#");
    expect(label).not.toContain("FFFFFF");
  });
});
