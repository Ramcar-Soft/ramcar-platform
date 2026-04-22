import { describe, it, expect } from "vitest";
import { COLOR_CATALOG, COLOR_CATEGORIES } from "../color-catalog";

describe("COLOR_CATALOG", () => {
  it("contains exactly 100 entries", () => {
    expect(COLOR_CATALOG).toHaveLength(100);
  });

  it("has unique keys", () => {
    const keys = COLOR_CATALOG.map((e) => e.key);
    expect(new Set(keys).size).toBe(100);
  });

  it("has unique HEX values (reverse-lookup must be 1:1)", () => {
    const hexes = COLOR_CATALOG.map((e) => e.hex);
    expect(new Set(hexes).size).toBe(100);
  });

  it("all HEX values are uppercase 7-char codes", () => {
    for (const entry of COLOR_CATALOG) {
      expect(entry.hex).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("every entry has a valid category", () => {
    for (const entry of COLOR_CATALOG) {
      expect(COLOR_CATEGORIES).toContain(entry.category);
    }
  });

  it("category counts match: 20/15/15/13/13/12/12", () => {
    const counts: Record<string, number> = {};
    for (const entry of COLOR_CATALOG) {
      counts[entry.category] = (counts[entry.category] ?? 0) + 1;
    }
    expect(counts).toEqual({
      neutrals: 20,
      blues: 15,
      reds: 15,
      greens: 13,
      yellowsOranges: 13,
      earth: 12,
      premium: 12,
    });
  });

  it("only the 4 premium effect entries carry an effect field", () => {
    const withEffect = COLOR_CATALOG.filter((e) => e.effect !== undefined);
    expect(withEffect.map((e) => e.key).sort()).toEqual([
      "chameleon_black",
      "chameleon_blue_purple",
      "chameleon_multicolor",
      "chrome_gray",
    ]);
    for (const entry of withEffect) {
      expect(entry.category).toBe("premium");
      expect(["chameleon", "chrome"]).toContain(entry.effect);
    }
  });
});
