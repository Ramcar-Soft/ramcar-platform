import { describe, it, expect } from "vitest";
import {
  usernameSchema,
  usernameOptionalSchema,
  stripUsernameChars,
} from "./username";

describe("usernameSchema", () => {
  const valid = ["juan.perez", "maria-lopez", "admin_1", "a1b", "abc", "a1-2.3_4"];
  it.each(valid)("accepts %s", (v) => {
    expect(usernameSchema.safeParse(v).success).toBe(true);
  });

  const invalid: Array<[string, string]> = [
    [".juan", "starts with non-alphanumeric"],
    ["-juan", "starts with -"],
    ["_juan", "starts with _"],
    ["juan.", "ends with ."],
    ["juan_", "ends with _"],
    ["juan-", "ends with -"],
    ["ju", "under 3 chars"],
    ["a".repeat(31), "over 30 chars"],
    ["juan..perez", "consecutive ."],
    ["juan__perez", "consecutive _"],
    ["juan--perez", "consecutive -"],
    ["juan perez", "contains space"],
    ["juan@perez", "contains @"],
    ["juan/perez", "contains /"],
  ];

  it.each(invalid)("rejects %s (%s)", (v) => {
    expect(usernameSchema.safeParse(v).success).toBe(false);
  });
});

describe("usernameOptionalSchema", () => {
  it("accepts empty string", () => {
    expect(usernameOptionalSchema.safeParse("").success).toBe(true);
  });

  it("accepts a valid username", () => {
    expect(usernameOptionalSchema.safeParse("juan.perez").success).toBe(true);
  });

  it("rejects a too-short username", () => {
    expect(usernameOptionalSchema.safeParse("ab").success).toBe(false);
  });
});

describe("stripUsernameChars", () => {
  it("removes characters outside [a-zA-Z0-9._-]", () => {
    expect(stripUsernameChars("juan@perez!")).toBe("juanperez");
  });

  it("removes spaces", () => {
    expect(stripUsernameChars("juan perez")).toBe("juanperez");
  });

  it("preserves allowed separators", () => {
    expect(stripUsernameChars("a1.b2-c3_d4")).toBe("a1.b2-c3_d4");
  });

  it("returns empty string unchanged", () => {
    expect(stripUsernameChars("")).toBe("");
  });
});
