import { describe, it, expect } from "vitest";
import {
  normalizeHex,
  isHex,
  lookupByHex,
  normalizeSearch,
  buildSearchToken,
} from "../color-lookup";

describe("normalizeHex", () => {
  it("uppercases a 6-char hex", () => {
    expect(normalizeHex("#c8102e")).toBe("#C8102E");
  });

  it("expands a 3-char hex to 6-char", () => {
    expect(normalizeHex("#fff")).toBe("#FFFFFF");
    expect(normalizeHex("#0a3")).toBe("#00AA33");
  });

  it("leaves a valid uppercase hex unchanged", () => {
    expect(normalizeHex("#C8102E")).toBe("#C8102E");
  });

  it("returns null for non-hex input", () => {
    expect(normalizeHex("")).toBeNull();
    expect(normalizeHex("blanco")).toBeNull();
    expect(normalizeHex("red")).toBeNull();
    expect(normalizeHex("#GGGGGG")).toBeNull();
    expect(normalizeHex("#12345")).toBeNull();
    expect(normalizeHex(null as unknown as string)).toBeNull();
  });
});

describe("isHex", () => {
  it("recognizes canonical and lenient hex", () => {
    expect(isHex("#C8102E")).toBe(true);
    expect(isHex("#c8102e")).toBe(true);
    expect(isHex("#fff")).toBe(true);
  });

  it("rejects free text", () => {
    expect(isHex("blanco metalizado")).toBe(false);
    expect(isHex("")).toBe(false);
  });
});

describe("lookupByHex", () => {
  it("finds the catalog entry for a canonical HEX", () => {
    const entry = lookupByHex("#C8102E");
    expect(entry?.key).toBe("solid_red");
    expect(entry?.category).toBe("reds");
  });

  it("is case-insensitive on input", () => {
    expect(lookupByHex("#c8102e")?.key).toBe("solid_red");
  });

  it("returns null for custom HEX not in the catalog", () => {
    expect(lookupByHex("#7A4B2C")).toBeNull();
  });

  it("returns null for free text", () => {
    expect(lookupByHex("blanco")).toBeNull();
    expect(lookupByHex("")).toBeNull();
  });
});

describe("normalizeSearch", () => {
  it("lowercases and strips combining diacritics", () => {
    expect(normalizeSearch("Café")).toBe("cafe");
    expect(normalizeSearch("Rojo Oscuro")).toBe("rojo oscuro");
    expect(normalizeSearch("ÁÉÍÓÚñ")).toBe("aeioun");
  });

  it("passes through plain ASCII", () => {
    expect(normalizeSearch("red")).toBe("red");
  });
});

describe("buildSearchToken", () => {
  it("concatenates normalized EN label, ES label, and lowercase HEX", () => {
    const token = buildSearchToken({
      key: "solid_red",
      hex: "#C8102E",
      en: "Solid red",
      es: "Rojo sólido",
    });
    // All three tokens present, normalized
    expect(token).toContain("solid red");
    expect(token).toContain("rojo solido");
    expect(token).toContain("#c8102e");
  });
});
