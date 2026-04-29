/**
 * Desktop offline brand-logo test — spec 022 SC-005
 *
 * Verifies that getBrandLogoUrl() and BRAND_LOGO_REGISTRY work completely
 * offline: no network request is issued, and all 20 brands resolve to a
 * non-null URL (the bundled static asset path).
 *
 * This is a Vitest unit test running in the desktop renderer's jsdom environment.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getBrandLogoUrl } from "@ramcar/features/shared";
import { BRAND_LOGO_REGISTRY } from "@ramcar/features/shared/vehicle-brand-logos";

const KNOWN_BRANDS = [
  "Audi", "BMW", "BYD", "Chevrolet", "Chirey", "Ford", "GAC", "Geely",
  "GMC", "Honda", "Hyundai", "JAC", "Jaecoo", "Jeep", "Kia", "Mazda",
  "Mercedes-Benz", "MG", "Mitsubishi", "Nissan", "Omoda", "Peugeot",
  "RAM", "Renault", "SEAT", "Subaru", "Suzuki", "Tesla", "Toyota", "Volkswagen",
];

describe("brand-logo-offline — SC-005 no network at all", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  let xhrOpenSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.fn().mockImplementation(() => {
      throw new Error("SC-005: fetch must not be called for logo resolution");
    });
    vi.stubGlobal("fetch", fetchSpy);

    xhrOpenSpy = vi.spyOn(XMLHttpRequest.prototype, "open").mockImplementation(() => {
      throw new Error("SC-005: XMLHttpRequest must not be called for logo resolution");
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    xhrOpenSpy.mockRestore();
  });

  it("all 30 known brands resolve without issuing any network request", () => {
    for (const brand of KNOWN_BRANDS) {
      const url = getBrandLogoUrl(brand);
      expect(url, `${brand} should resolve to a non-null URL`).not.toBeNull();
      expect(typeof url).toBe("string");
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrOpenSpy).not.toHaveBeenCalled();
  });

  it("BRAND_LOGO_REGISTRY values are all non-empty strings (bundled asset URLs)", () => {
    for (const [brand, url] of Object.entries(BRAND_LOGO_REGISTRY)) {
      expect(url, `${brand} registry URL must be a non-empty string`).toBeTruthy();
      expect(typeof url).toBe("string");
    }
  });

  it("BRAND_LOGO_REGISTRY covers all known brands", () => {
    expect(Object.keys(BRAND_LOGO_REGISTRY)).toHaveLength(KNOWN_BRANDS.length);
    for (const brand of KNOWN_BRANDS) {
      expect(BRAND_LOGO_REGISTRY[brand], `${brand} must be in registry`).toBeDefined();
    }
  });

  it("unknown brands return null without any network request", () => {
    const unknownBrands = ["Ferrari", "Made-Up Brand", "ACME", null, undefined, ""];
    for (const brand of unknownBrands) {
      const result = getBrandLogoUrl(brand);
      expect(result).toBeNull();
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrOpenSpy).not.toHaveBeenCalled();
  });
});
