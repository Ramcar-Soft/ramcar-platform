import { describe, it, expect } from "vitest";
import {
  createVisitPersonSchema,
  updateVisitPersonSchema,
  visitPersonFiltersSchema,
} from "./visit-person";

describe("createVisitPersonSchema", () => {
  const base = {
    type: "visitor" as const,
    fullName: "Jane Visitor",
    status: "allowed" as const,
  };

  it("accepts the minimal input (type + fullName)", () => {
    expect(createVisitPersonSchema.safeParse(base).success).toBe(true);
  });

  it("accepts empty phone", () => {
    expect(
      createVisitPersonSchema.safeParse({ ...base, phone: "" }).success,
    ).toBe(true);
  });

  it("normalizes a valid MX phone to E.164", () => {
    const result = createVisitPersonSchema.safeParse({
      ...base,
      phone: "555 123 4567",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe("+525551234567");
  });

  it("accepts international phone with + prefix", () => {
    const result = createVisitPersonSchema.safeParse({
      ...base,
      phone: "+14155551234",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe("+14155551234");
  });

  it("rejects invalid phone (letters)", () => {
    expect(
      createVisitPersonSchema.safeParse({ ...base, phone: "not-a-phone" })
        .success,
    ).toBe(false);
  });

  it("rejects phone with 9 digits", () => {
    expect(
      createVisitPersonSchema.safeParse({ ...base, phone: "123456789" }).success,
    ).toBe(false);
  });
});

describe("createVisitPersonSchema status default", () => {
  it("defaults status to 'flagged' when omitted", () => {
    const result = createVisitPersonSchema.safeParse({
      type: "visitor",
      fullName: "Anonymous Visitor",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe("flagged");
  });

  it("still accepts an explicit status: 'allowed'", () => {
    const result = createVisitPersonSchema.safeParse({
      type: "visitor",
      fullName: "Anonymous Visitor",
      status: "allowed",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe("allowed");
  });
});

describe("updateVisitPersonSchema", () => {
  it("accepts an empty update", () => {
    expect(updateVisitPersonSchema.safeParse({}).success).toBe(true);
  });

  it("normalizes phone on update", () => {
    const result = updateVisitPersonSchema.safeParse({ phone: "(555) 123-4567" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe("+525551234567");
  });

  it("rejects an invalid phone on update", () => {
    expect(
      updateVisitPersonSchema.safeParse({ phone: "abc" }).success,
    ).toBe(false);
  });
});

describe("visitPersonFiltersSchema", () => {
  it("applies defaults", () => {
    const result = visitPersonFiltersSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
      expect(result.data.sortBy).toBe("full_name");
      expect(result.data.sortOrder).toBe("asc");
    }
  });
});
