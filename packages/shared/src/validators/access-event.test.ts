import { describe, it, expect } from "vitest";
import { accessEventListQuerySchema, accessEventExportQuerySchema } from "./access-event";

describe("accessEventListQuerySchema", () => {
  it("requires personType", () => {
    const result = accessEventListQuerySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts valid visitor personType", () => {
    const result = accessEventListQuerySchema.safeParse({ personType: "visitor" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid pageSize", () => {
    const result = accessEventListQuerySchema.safeParse({ personType: "visitor", pageSize: "15" });
    expect(result.success).toBe(false);
  });

  it("accepts valid pageSize values", () => {
    for (const size of [10, 25, 50, 100]) {
      const result = accessEventListQuerySchema.safeParse({ personType: "visitor", pageSize: String(size) });
      expect(result.success).toBe(true);
    }
  });

  it("defaults locale to en", () => {
    const result = accessEventListQuerySchema.safeParse({ personType: "visitor" });
    expect(result.success && result.data.locale).toBe("en");
  });

  it("defaults page to 1", () => {
    const result = accessEventListQuerySchema.safeParse({ personType: "visitor" });
    expect(result.success && result.data.page).toBe(1);
  });

  it("trims and max-length validates search", () => {
    const longSearch = "a".repeat(201);
    const result = accessEventListQuerySchema.safeParse({ personType: "visitor", search: longSearch });
    expect(result.success).toBe(false);
  });

  it("accepts search up to 200 chars", () => {
    const validSearch = "a".repeat(200);
    const result = accessEventListQuerySchema.safeParse({ personType: "visitor", search: validSearch });
    expect(result.success).toBe(true);
  });

  it("accepts valid date format", () => {
    const result = accessEventListQuerySchema.safeParse({
      personType: "visitor",
      dateFrom: "2026-04-22",
      dateTo: "2026-04-22",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid date format", () => {
    const result = accessEventListQuerySchema.safeParse({
      personType: "visitor",
      dateFrom: "22/04/2026",
    });
    expect(result.success).toBe(false);
  });
});

describe("accessEventExportQuerySchema", () => {
  it("omits page and pageSize", () => {
    const result = accessEventExportQuerySchema.safeParse({ personType: "visitor" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("page" in result.data).toBe(false);
      expect("pageSize" in result.data).toBe(false);
    }
  });
});
