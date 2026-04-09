import { describe, it, expect } from "vitest";

describe("apps/web smoke test", () => {
  it("vitest runs correctly in the web workspace", () => {
    expect(1 + 1).toBe(2);
  });
});
