import { describe, it, expect } from "vitest";
import { BRAND_LOGO_REGISTRY } from "./logo-registry";
import { VEHICLE_BRAND_MODEL } from "../vehicle-brand-model/data";

describe("BRAND_LOGO_REGISTRY — R1 frozen", () => {
  it("is a frozen object", () => {
    expect(Object.isFrozen(BRAND_LOGO_REGISTRY)).toBe(true);
  });
});

describe("BRAND_LOGO_REGISTRY — R2 complete coverage", () => {
  const brands = Object.keys(VEHICLE_BRAND_MODEL);
  it.each(brands)("has a non-empty URL for brand %s", (brand) => {
    const url = BRAND_LOGO_REGISTRY[brand];
    expect(typeof url).toBe("string");
    expect(url.length).toBeGreaterThan(0);
  });
});

describe("BRAND_LOGO_REGISTRY — R3 closed key set", () => {
  it("every registry key exists in VEHICLE_BRAND_MODEL", () => {
    for (const key of Object.keys(BRAND_LOGO_REGISTRY)) {
      expect(VEHICLE_BRAND_MODEL).toHaveProperty(key);
    }
  });
});

describe("BRAND_LOGO_REGISTRY — R4 alphabetical ordering", () => {
  it("keys are sorted alphabetically", () => {
    const keys = Object.keys(BRAND_LOGO_REGISTRY);
    const collator = new Intl.Collator();
    const sorted = [...keys].sort((a, b) => collator.compare(a, b));
    expect(keys).toEqual(sorted);
  });
});

describe("BRAND_LOGO_REGISTRY — R5 unique URLs", () => {
  it("no two brands share the same asset URL", () => {
    const values = Object.values(BRAND_LOGO_REGISTRY);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

describe("BRAND_LOGO_REGISTRY — cardinality matches VEHICLE_BRAND_MODEL", () => {
  it("has exactly the same number of entries as VEHICLE_BRAND_MODEL", () => {
    expect(Object.keys(BRAND_LOGO_REGISTRY).length).toBe(
      Object.keys(VEHICLE_BRAND_MODEL).length
    );
  });
});
