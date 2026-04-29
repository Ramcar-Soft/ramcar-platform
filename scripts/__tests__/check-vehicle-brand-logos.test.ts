import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

const SCRIPT_PATH = path.resolve(__dirname, "../check-vehicle-brand-logos.ts");
const ROOT = path.resolve(__dirname, "../..");

function runScript(env: Record<string, string> = {}): { exitCode: number; output: string } {
  try {
    const output = execSync(`pnpm exec tsx "${SCRIPT_PATH}"`, {
      cwd: ROOT,
      env: { ...process.env, ...env },
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { exitCode: 0, output };
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return {
      exitCode: e.status ?? 1,
      output: (e.stdout ?? "") + (e.stderr ?? ""),
    };
  }
}

function createFixtureDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ramcar-brand-logo-test-"));
}

describe("check-vehicle-brand-logos — live run (happy path)", () => {
  it("exits 0 with the current repo state", () => {
    const result = runScript();
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("✓ vehicle-brand-logos check");
    expect(result.output).toContain("20 brands, 20 logos");
    expect(result.output).toContain("LICENSE-third-party.md OK");
  });
});

describe("check-vehicle-brand-logos — asset budget check", () => {
  it("current assets are under the 500 KB budget", () => {
    const result = runScript();
    expect(result.exitCode).toBe(0);
    const match = /assets\/ size (\d+) KB \/ 500 KB budget/.exec(result.output);
    expect(match).not.toBeNull();
    const kb = parseInt(match![1], 10);
    expect(kb).toBeLessThanOrEqual(500);
  });
});

describe("check-vehicle-brand-logos — C7 attribution check", () => {
  let tmpDir: string;
  let origLicense: string | null = null;
  const licenseFile = path.join(ROOT, "LICENSE-third-party.md");

  beforeEach(() => {
    tmpDir = createFixtureDir();
    if (fs.existsSync(licenseFile)) {
      origLicense = fs.readFileSync(licenseFile, "utf-8");
    }
  });

  afterEach(() => {
    if (origLicense !== null) {
      fs.writeFileSync(licenseFile, origLicense);
    } else if (fs.existsSync(licenseFile)) {
      fs.unlinkSync(licenseFile);
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("fails with C7 violation when LICENSE-third-party.md lacks car-logos-dataset", () => {
    fs.writeFileSync(licenseFile, "# Third-Party Licenses\n\nSome other attribution only.");
    const result = runScript();
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("car-logos-dataset");
    expect(result.output).toContain("C7");
  });
});

describe("check-vehicle-brand-logos — C4 file sanity fixture", () => {
  it("SVG assets in real repo all start with <svg and are >= 32 bytes", () => {
    const assetsDir = path.join(ROOT, "packages/features/src/shared/vehicle-brand-logos/assets");
    const files = fs.readdirSync(assetsDir).filter((f) => f.endsWith(".svg"));
    expect(files.length).toBe(20);

    for (const file of files) {
      const filePath = path.join(assetsDir, file);
      const stat = fs.statSync(filePath);
      expect(stat.size, `${file} must be >= 32 bytes`).toBeGreaterThanOrEqual(32);

      const buf = Buffer.alloc(4);
      const fd = fs.openSync(filePath, "r");
      fs.readSync(fd, buf, 0, 4, 0);
      fs.closeSync(fd);
      expect(buf.toString("utf-8"), `${file} must start with <svg`).toBe("<svg");
    }
  });
});

describe("check-vehicle-brand-logos — C5 slug uniqueness", () => {
  it("all 20 brand slugs are unique", () => {
    const brands = [
      "BYD", "Chevrolet", "Chirey", "Ford", "GMC", "Honda", "Hyundai",
      "JAC", "Jeep", "Kia", "Mazda", "MG", "Nissan", "Peugeot", "RAM",
      "Renault", "SEAT", "Subaru", "Toyota", "Volkswagen",
    ];
    const slugs = brands.map((b) =>
      b.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    );
    const unique = new Set(slugs);
    expect(unique.size).toBe(brands.length);
  });
});

describe("check-vehicle-brand-logos — C1/C2/C3 registry/data consistency", () => {
  it("live repo has no C1, C2, or C3 violations", () => {
    const result = runScript();
    expect(result.exitCode).toBe(0);
    expect(result.output).not.toContain("Missing logo for brand");
    expect(result.output).not.toContain("Orphan logo entry");
    expect(result.output).not.toContain("Abandoned asset");
  });
});
