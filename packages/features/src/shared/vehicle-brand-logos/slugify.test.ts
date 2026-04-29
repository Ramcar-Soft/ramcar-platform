import { describe, it, expect } from "vitest";
import { slugify } from "./slugify";
import { VEHICLE_BRAND_MODEL } from "../vehicle-brand-model/data";

describe("slugify — I-S1 determinism", () => {
  it("returns the same value for identical inputs", () => {
    expect(slugify("Nissan")).toBe(slugify("Nissan"));
    expect(slugify("Volkswagen")).toBe(slugify("Volkswagen"));
    expect(slugify("BYD")).toBe(slugify("BYD"));
  });
});

describe("slugify — I-S2 output charset /^[a-z0-9-]+$/", () => {
  const brands = Object.keys(VEHICLE_BRAND_MODEL);
  it.each(brands)("slug for %s matches /^[a-z0-9-]+$/", (brand) => {
    const slug = slugify(brand);
    expect(slug).toMatch(/^[a-z0-9-]+$/);
  });
});

describe("slugify — I-S3 no leading/trailing hyphen", () => {
  const brands = Object.keys(VEHICLE_BRAND_MODEL);
  it.each(brands)("slug for %s has no leading/trailing hyphen", (brand) => {
    const slug = slugify(brand);
    expect(slug).not.toMatch(/^-/);
    expect(slug).not.toMatch(/-$/);
  });
});

describe("slugify — I-S4 unique slugs across VEHICLE_BRAND_MODEL", () => {
  it("every brand key produces a unique slug", () => {
    const brands = Object.keys(VEHICLE_BRAND_MODEL);
    const slugs = brands.map(slugify);
    const unique = new Set(slugs);
    expect(unique.size).toBe(brands.length);
  });
});

describe("slugify — specific cases", () => {
  it("lowercases all characters", () => {
    expect(slugify("NISSAN")).toBe("nissan");
    expect(slugify("GMC")).toBe("gmc");
    expect(slugify("RAM")).toBe("ram");
    expect(slugify("SEAT")).toBe("seat");
    expect(slugify("MG")).toBe("mg");
    expect(slugify("BYD")).toBe("byd");
    expect(slugify("JAC")).toBe("jac");
  });

  it("strips combining diacritical marks", () => {
    expect(slugify("Séat")).toBe("seat");
    expect(slugify("Renàult")).toBe("renault");
  });

  it("replaces non-alphanumeric runs with single hyphen", () => {
    expect(slugify("Brand Name")).toBe("brand-name");
    expect(slugify("Brand  Name")).toBe("brand-name");
  });
});
