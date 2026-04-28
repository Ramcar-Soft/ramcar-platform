import { describe, it, expect, vi, afterEach } from "vitest";
import { createVehicleSchema, currentYear, updateVehicleSchema } from "./vehicle";

const BASE_USER = {
  ownerType: "user" as const,
  userId: "11111111-1111-1111-1111-111111111111",
  vehicleType: "car" as const,
};

afterEach(() => {
  vi.useRealTimers();
});

describe("createVehicleSchema — year field (T031)", () => {
  it("accepts a valid year (2019)", () => {
    const result = createVehicleSchema.safeParse({ ...BASE_USER, year: 2019 });
    expect(result.success).toBe(true);
  });

  it("accepts year = undefined (optional)", () => {
    const result = createVehicleSchema.safeParse({ ...BASE_USER });
    expect(result.success).toBe(true);
  });

  it("rejects year below lower bound (1959)", () => {
    const result = createVehicleSchema.safeParse({ ...BASE_USER, year: 1959 });
    expect(result.success).toBe(false);
  });

  it("rejects year = 1800 (below lower bound)", () => {
    const result = createVehicleSchema.safeParse({ ...BASE_USER, year: 1800 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer (2.5)", () => {
    const result = createVehicleSchema.safeParse({ ...BASE_USER, year: 2.5 });
    expect(result.success).toBe(false);
  });

  it("rejects string '2019' (no coercion)", () => {
    const result = createVehicleSchema.safeParse({ ...BASE_USER, year: "2019" });
    expect(result.success).toBe(false);
  });

  it("accepts year equal to currentYear + 1", () => {
    const year = new Date().getFullYear() + 1;
    const result = createVehicleSchema.safeParse({ ...BASE_USER, year });
    expect(result.success).toBe(true);
  });

  it("rejects year exceeding currentYear + 1", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T00:00:00Z"));
    const result = createVehicleSchema.safeParse({ ...BASE_USER, year: 2028 });
    expect(result.success).toBe(false);
    vi.useRealTimers();
  });
});

describe("currentYear", () => {
  it("returns a four-digit year", () => {
    expect(currentYear()).toBeGreaterThanOrEqual(2024);
  });
});

describe("updateVehicleSchema", () => {
  it("accepts a partial valid update", () => {
    const result = updateVehicleSchema.safeParse({ plate: "ABC-1234" });
    expect(result.success).toBe(true);
  });

  it("accepts an empty object", () => {
    const result = updateVehicleSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects ownerType", () => {
    const result = updateVehicleSchema.safeParse({ ownerType: "user" });
    expect(result.success).toBe(false);
  });

  it("rejects userId", () => {
    const result = updateVehicleSchema.safeParse({
      userId: "00000000-0000-0000-0000-000000000000",
    });
    expect(result.success).toBe(false);
  });

  it("rejects visitPersonId", () => {
    const result = updateVehicleSchema.safeParse({
      visitPersonId: "00000000-0000-0000-0000-000000000000",
    });
    expect(result.success).toBe(false);
  });

  it("rejects tenantId", () => {
    const result = updateVehicleSchema.safeParse({
      tenantId: "00000000-0000-0000-0000-000000000000",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields", () => {
    const result = updateVehicleSchema.safeParse({ totallyMadeUp: true });
    expect(result.success).toBe(false);
  });
});
