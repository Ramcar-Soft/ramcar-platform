import { describe, it, expect } from "vitest";
import { parseFilters, buildUrl } from "../hooks/use-logbook-filters";

describe("parseFilters", () => {
  it("returns defaults for empty params", () => {
    const result = parseFilters(new URLSearchParams());
    expect(result.datePreset).toBe("today");
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
    expect(result.search).toBeUndefined();
    expect(result.dateFrom).toBeUndefined();
    expect(result.dateTo).toBeUndefined();
    expect(result.tenantId).toBeUndefined();
    expect(result.residentId).toBeUndefined();
  });

  it("parses all params", () => {
    const params = new URLSearchParams(
      "date_preset=last_7d&page=2&page_size=50&search=foo&tenant_id=abc&resident_id=def",
    );
    const result = parseFilters(params);
    expect(result.datePreset).toBe("last_7d");
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(50);
    expect(result.search).toBe("foo");
    expect(result.tenantId).toBe("abc");
    expect(result.residentId).toBe("def");
  });

  it("parses custom preset with date_from and date_to", () => {
    const params = new URLSearchParams(
      "date_preset=custom&date_from=2026-04-01&date_to=2026-04-22",
    );
    const result = parseFilters(params);
    expect(result.datePreset).toBe("custom");
    expect(result.dateFrom).toBe("2026-04-01");
    expect(result.dateTo).toBe("2026-04-22");
  });

  it("rejects invalid pageSize and falls back to 25", () => {
    const params = new URLSearchParams("page_size=15");
    const result = parseFilters(params);
    expect(result.pageSize).toBe(25);
  });

  it("accepts all valid page sizes", () => {
    for (const size of [10, 25, 50, 100]) {
      const result = parseFilters(new URLSearchParams(`page_size=${size}`));
      expect(result.pageSize).toBe(size);
    }
  });

  it("rejects invalid datePreset and falls back to today", () => {
    const params = new URLSearchParams("date_preset=invalid");
    const result = parseFilters(params);
    expect(result.datePreset).toBe("today");
  });

  it("clamps page to at least 1 when given a non-positive value", () => {
    expect(parseFilters(new URLSearchParams("page=0")).page).toBe(1);
    expect(parseFilters(new URLSearchParams("page=-5")).page).toBe(1);
    expect(parseFilters(new URLSearchParams("page=abc")).page).toBe(1);
  });
});

describe("buildUrl", () => {
  it("omits default values from URL", () => {
    const url = buildUrl("/en/logbook/visitors", {
      datePreset: "today",
      page: 1,
      pageSize: 25,
    });
    expect(url).toBe("/en/logbook/visitors");
  });

  it("includes non-default values", () => {
    const url = buildUrl("/en/logbook/visitors", {
      datePreset: "last_7d",
      page: 2,
      pageSize: 50,
    });
    expect(url).toContain("date_preset=last_7d");
    expect(url).toContain("page=2");
    expect(url).toContain("page_size=50");
  });

  it("includes date range for custom preset", () => {
    const url = buildUrl("/en/logbook/visitors", {
      datePreset: "custom",
      dateFrom: "2026-04-01",
      dateTo: "2026-04-22",
      page: 1,
      pageSize: 25,
    });
    expect(url).toContain("date_preset=custom");
    expect(url).toContain("date_from=2026-04-01");
    expect(url).toContain("date_to=2026-04-22");
  });

  it("does not include search when undefined", () => {
    const url = buildUrl("/path", {
      datePreset: "today",
      page: 1,
      pageSize: 25,
    });
    expect(url).not.toContain("search");
  });

  it("includes tenantId and residentId when set", () => {
    const url = buildUrl("/path", {
      datePreset: "today",
      page: 1,
      pageSize: 25,
      tenantId: "tenant-1",
      residentId: "resident-1",
    });
    expect(url).toContain("tenant_id=tenant-1");
    expect(url).toContain("resident_id=resident-1");
  });

  it("includes search when set", () => {
    const url = buildUrl("/path", {
      datePreset: "today",
      page: 1,
      pageSize: 25,
      search: "jane",
    });
    expect(url).toContain("search=jane");
  });

  it("round-trips via parseFilters for a complex filter set", () => {
    const pathname = "/en/logbook/visitors";
    const original = {
      datePreset: "custom" as const,
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      tenantId: "t1",
      residentId: "r1",
      search: "acme",
      page: 3,
      pageSize: 50 as const,
    };
    const url = buildUrl(pathname, original);
    const qs = url.slice(url.indexOf("?") + 1);
    const parsed = parseFilters(new URLSearchParams(qs));
    expect(parsed).toEqual(original);
  });
});
