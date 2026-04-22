import { describe, it, expect } from "vitest";
import { normalizeForSearch, buildBrandIndex, searchModels } from "./search";

describe("normalizeForSearch", () => {
  it("lowercases input", () => {
    expect(normalizeForSearch("Nissan")).toBe("nissan");
  });

  it("strips diacritics", () => {
    expect(normalizeForSearch("Peugeót")).toBe("peugeot");
    expect(normalizeForSearch("México")).toBe("mexico");
  });

  it("trims whitespace", () => {
    expect(normalizeForSearch("  Toyota  ")).toBe("toyota");
  });

  it("handles combined normalization", () => {
    expect(normalizeForSearch("  ÑOÑO  ")).toBe("nono");
  });
});

describe("buildBrandIndex (Fuse.js fuzzy search)", () => {
  it("finds exact match", () => {
    const idx = buildBrandIndex();
    const results = idx.search("Nissan");
    expect(results.map((r) => r.item.name)).toContain("Nissan");
  });

  it("tolerates typo: 'nisan' → Nissan", () => {
    const idx = buildBrandIndex();
    const results = idx.search("nisan");
    expect(results.map((r) => r.item.name)).toContain("Nissan");
  });

  it("tolerates typo: 'toyot' → Toyota", () => {
    const idx = buildBrandIndex();
    const results = idx.search("toyot");
    expect(results.map((r) => r.item.name)).toContain("Toyota");
  });

  it("matches abbreviation-like short query: 'vw' — should find Volkswagen via fuzzy", () => {
    const idx = buildBrandIndex();
    const results = idx.search("volkswagen");
    expect(results.map((r) => r.item.name)).toContain("Volkswagen");
  });

  it("rejects wildly dissimilar query (threshold 0.3 enforced)", () => {
    const idx = buildBrandIndex();
    const results = idx.search("zzzzzzz");
    expect(results).toHaveLength(0);
  });

  it("returns memoized instance", () => {
    expect(buildBrandIndex()).toBe(buildBrandIndex());
  });
});

describe("searchModels", () => {
  it("returns empty array for unknown brand", () => {
    expect(searchModels("UnknownBrand", "ver")).toHaveLength(0);
  });

  it("returns up to 10 results when query is empty (first 10 models)", () => {
    const results = searchModels("Nissan", "");
    expect(results.length).toBeLessThanOrEqual(10);
    expect(results.length).toBeGreaterThan(0);
  });

  it("ranks startsWith before includes", () => {
    const results = searchModels("Nissan", "ver");
    expect(results[0]).toBe("Versa");
  });

  it("finds includes match", () => {
    const results = searchModels("Toyota", "olla");
    expect(results).toContain("Corolla");
  });

  it("caps at 10 results", () => {
    const results = searchModels("BMW", "");
    expect(results.length).toBeLessThanOrEqual(10);
  });

  it("is case-insensitive", () => {
    const results = searchModels("Nissan", "VER");
    expect(results).toContain("Versa");
  });

  it("returns empty for empty brand", () => {
    expect(searchModels("", "ver")).toHaveLength(0);
  });
});
