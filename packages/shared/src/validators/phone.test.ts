import { describe, it, expect } from "vitest";
import { phoneSchema, phoneOptionalSchema, normalizePhone } from "./phone";

describe("phoneSchema", () => {
  const validMxCases: Array<[string, string]> = [
    ["5551234567", "+525551234567"],
    ["(555) 123-4567", "+525551234567"],
    ["555-123-4567", "+525551234567"],
    ["555 123 4567", "+525551234567"],
    ["  5551234567  ", "+525551234567"],
  ];

  it.each(validMxCases)("accepts MX %s → %s", (raw, expected) => {
    const result = phoneSchema.safeParse(raw);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(expected);
  });

  const validIntlCases: Array<[string, string]> = [
    ["+14155551234", "+14155551234"],
    ["+525551234567", "+525551234567"],
    ["+1 415 555 1234", "+14155551234"],
  ];

  it.each(validIntlCases)("accepts international %s → %s", (raw, expected) => {
    const result = phoneSchema.safeParse(raw);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(expected);
  });

  const invalidCases = [
    "",
    "123",
    "abc1234567",
    "555123456",       // 9 digits
    "55512345678",     // 11 digits no +
    "+1234",
  ];

  it.each(invalidCases)("rejects %s", (raw) => {
    const result = phoneSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });
});

describe("phoneOptionalSchema", () => {
  it("accepts empty string", () => {
    const result = phoneOptionalSchema.safeParse("");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("");
  });

  it("accepts valid MX phone and normalizes", () => {
    const result = phoneOptionalSchema.safeParse("(555) 123-4567");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("+525551234567");
  });

  it("rejects invalid phone", () => {
    const result = phoneOptionalSchema.safeParse("abc");
    expect(result.success).toBe(false);
  });
});

describe("normalizePhone", () => {
  it("returns E.164 for valid MX input", () => {
    expect(normalizePhone("555 123 4567")).toBe("+525551234567");
  });

  it("returns E.164 for valid international input", () => {
    expect(normalizePhone("+14155551234")).toBe("+14155551234");
  });

  it("returns null for invalid input", () => {
    expect(normalizePhone("abc")).toBe(null);
    expect(normalizePhone("123")).toBe(null);
  });

  it("returns null for empty input", () => {
    expect(normalizePhone("")).toBe(null);
    expect(normalizePhone("   ")).toBe(null);
  });
});
