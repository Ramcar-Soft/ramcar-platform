import { describe, it, expect, vi, beforeEach } from "vitest";
import { getBrandLogoUrl } from "./get-brand-logo-url";
import { VEHICLE_BRAND_MODEL } from "../vehicle-brand-model/data";

describe("getBrandLogoUrl — B1 canonical match", () => {
  it("returns a string for a known brand", () => {
    expect(typeof getBrandLogoUrl("Nissan")).toBe("string");
    expect(getBrandLogoUrl("Nissan")).toBeTruthy();
  });
});

describe("getBrandLogoUrl — B2 case-insensitive", () => {
  it("NISSAN resolves the same as Nissan", () => {
    expect(getBrandLogoUrl("NISSAN")).toBe(getBrandLogoUrl("Nissan"));
  });

  it("nissan resolves the same as Nissan", () => {
    expect(getBrandLogoUrl("nissan")).toBe(getBrandLogoUrl("Nissan"));
  });
});

describe("getBrandLogoUrl — B3 whitespace trim", () => {
  it("leading/trailing spaces are ignored", () => {
    expect(getBrandLogoUrl("  Nissan  ")).toBe(getBrandLogoUrl("Nissan"));
    expect(getBrandLogoUrl("\tToyota\n")).toBe(getBrandLogoUrl("Toyota"));
  });
});

describe("getBrandLogoUrl — B4 diacritic strip", () => {
  it("Séat resolves to the same logo as SEAT", () => {
    expect(getBrandLogoUrl("Séat")).toBe(getBrandLogoUrl("SEAT"));
  });
});

describe("getBrandLogoUrl — B5 unknown brand", () => {
  it("returns null for an unknown brand string", () => {
    expect(getBrandLogoUrl("Made-Up Brand")).toBeNull();
    expect(getBrandLogoUrl("Ferrari")).toBeNull();
    expect(getBrandLogoUrl("ACME")).toBeNull();
  });
});

describe("getBrandLogoUrl — B6 empty/nullish inputs", () => {
  it("returns null for null", () => {
    expect(getBrandLogoUrl(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(getBrandLogoUrl(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getBrandLogoUrl("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(getBrandLogoUrl("   ")).toBeNull();
  });
});

describe("getBrandLogoUrl — B7 stable identity", () => {
  it("same call returns same string reference", () => {
    const a = getBrandLogoUrl("Nissan");
    const b = getBrandLogoUrl("Nissan");
    expect(a).toBe(b);
  });
});

describe("getBrandLogoUrl — B8 no I/O", () => {
  beforeEach(() => {
    vi.spyOn(global, "fetch").mockImplementation(() => {
      throw new Error("getBrandLogoUrl must not issue network requests");
    });
  });

  it("does not call fetch for known brands", () => {
    const result = getBrandLogoUrl("Nissan");
    expect(result).toBeTruthy();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("does not call fetch for unknown brands", () => {
    const result = getBrandLogoUrl("Made-Up Brand");
    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("getBrandLogoUrl — all known brands resolve", () => {
  const knownBrands = Object.keys(VEHICLE_BRAND_MODEL);

  it.each(knownBrands)("%s returns a non-null URL", (brand) => {
    expect(getBrandLogoUrl(brand)).toBeTruthy();
  });
});
