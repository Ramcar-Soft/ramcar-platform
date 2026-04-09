import { describe, it, expect } from "vitest";

describe("apps/desktop smoke test", () => {
  it("vitest runs correctly in the desktop workspace", () => {
    expect(1 + 1).toBe(2);
  });
});
