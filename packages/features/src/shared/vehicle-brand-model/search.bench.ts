import { bench, describe } from "vitest";
import { buildBrandIndex } from "./search";

describe("brand search microbenchmark (p95 < 50 ms — SC-003)", () => {
  const queries = ["n", "nis", "toy", "maz", "volk"];

  bench("brand fuzzy search across representative queries", () => {
    const idx = buildBrandIndex();
    for (const q of queries) {
      idx.search(q);
    }
  });
});
