import { describe, it, expect } from "vitest";
import { emailSchema } from "./email";

describe("emailSchema", () => {
  it("accepts a valid address unchanged", () => {
    const result = emailSchema.safeParse("juan@example.com");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("juan@example.com");
  });

  it("trims leading/trailing whitespace", () => {
    const result = emailSchema.safeParse("  juan@example.com  ");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("juan@example.com");
  });

  it("lowercases mixed-case addresses", () => {
    const result = emailSchema.safeParse("Juan@Example.COM");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("juan@example.com");
  });

  it("rejects empty string", () => {
    expect(emailSchema.safeParse("").success).toBe(false);
  });

  it("rejects missing @", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });

  it("rejects missing TLD", () => {
    expect(emailSchema.safeParse("juan@example").success).toBe(false);
  });
});
