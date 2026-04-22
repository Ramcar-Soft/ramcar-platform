import { describe, it, expect } from "vitest";
import { VEHICLE_BRAND_MODEL } from "./data";

const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} \-\.]*$/u;

function normalizeForInvariant(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

describe("VEHICLE_BRAND_MODEL invariants", () => {
  const brands = Object.keys(VEHICLE_BRAND_MODEL);

  it("I-D5: brand count is within sanity band 10–100", () => {
    expect(brands.length).toBeGreaterThanOrEqual(10);
    expect(brands.length).toBeLessThanOrEqual(100);
  });

  it("I-D6: dataset is frozen", () => {
    expect(Object.isFrozen(VEHICLE_BRAND_MODEL)).toBe(true);
  });

  it("I-D1: no duplicate brand keys", () => {
    const unique = new Set(brands);
    expect(unique.size).toBe(brands.length);
  });

  it("I-D2: every brand has at least one model", () => {
    for (const brand of brands) {
      const models = VEHICLE_BRAND_MODEL[brand];
      expect(models.length, `${brand} must have ≥1 model`).toBeGreaterThan(0);
    }
  });

  it("I-D3: no duplicate models within a brand (case-insensitive, diacritic-normalized)", () => {
    for (const brand of brands) {
      const seen = new Set<string>();
      for (const model of VEHICLE_BRAND_MODEL[brand]) {
        const normalized = normalizeForInvariant(model);
        expect(seen.has(normalized), `Duplicate model "${model}" in brand "${brand}"`).toBe(false);
        seen.add(normalized);
      }
    }
  });

  it("I-D4: all brand and model names match allowed character set", () => {
    for (const brand of brands) {
      expect(NAME_RE.test(brand), `Brand name "${brand}" fails regex`).toBe(true);
      for (const model of VEHICLE_BRAND_MODEL[brand]) {
        expect(NAME_RE.test(model), `Model "${model}" in brand "${brand}" fails regex`).toBe(true);
      }
    }
  });
});
