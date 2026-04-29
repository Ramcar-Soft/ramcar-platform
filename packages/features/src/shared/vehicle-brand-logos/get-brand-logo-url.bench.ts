import { bench, describe } from "vitest";
import { getBrandLogoUrl } from "./get-brand-logo-url";
import { VEHICLE_BRAND_MODEL } from "../vehicle-brand-model/data";

const KNOWN_BRANDS = Object.keys(VEHICLE_BRAND_MODEL);

const UNKNOWN_BRANDS = [
  "Ferrari", "Lamborghini", "McLaren", "Bugatti", "Bentley",
  "Rolls-Royce", "Aston Martin", "Maserati", "Alfa Romeo", "Lancia",
  "ACME", "Made-Up Brand", "FakeCo", "XYZ Motors", "NoLogo",
  "Unknown", "Test Brand", "Sample", "Demo", "Placeholder",
];

describe("getBrandLogoUrl microbenchmark (p95 < 1 ms — SC-003)", () => {
  bench("10 000 lookups across known + unknown brands", () => {
    for (let i = 0; i < 500; i++) {
      for (const brand of KNOWN_BRANDS) {
        getBrandLogoUrl(brand);
      }
      for (const brand of UNKNOWN_BRANDS) {
        getBrandLogoUrl(brand);
      }
    }
  });
});
