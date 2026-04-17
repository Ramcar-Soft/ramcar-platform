import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { glob } from "glob";

interface FeatureEntry {
  name: string;
  migratedAt: string;
  package: string;
  notes?: string;
}

interface Manifest {
  features: FeatureEntry[];
  allowList?: string[];
}

function isPureReexport(content: string, featurePkg: string): boolean {
  const trimmed = content.trim();
  const pattern = /^export\s*\*\s*from\s*["'](@ramcar\/features[^"']*?)["'];?\s*$/;
  const match = pattern.exec(trimmed);
  if (!match) return false;
  const importedPkg = match[1];
  return importedPkg === featurePkg || importedPkg.startsWith(`${featurePkg}/`);
}

async function runCheck(tmpRoot: string, manifest: Manifest): Promise<{ passed: boolean; output: string }> {
  const manifestPath = path.join(tmpRoot, "shared-features.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  const allowList = (manifest.allowList ?? []).map((p) => path.join(tmpRoot, p));
  const violations: string[] = [];

  for (const feature of manifest.features) {
    for (const app of ["web", "desktop"]) {
      const featureDir = path.join(tmpRoot, "apps", app, "src", "features", feature.name);
      if (!fs.existsSync(featureDir)) continue;

      const files = await glob(`${featureDir}/**/*.{ts,tsx}`, { absolute: true, nodir: true });

      for (const file of files) {
        if (allowList.some((al) => file.startsWith(al) || file === al)) continue;
        const basename = path.basename(file);
        const content = fs.readFileSync(file, "utf-8");

        if (basename === "index.ts" || basename === "index.tsx") {
          if (!isPureReexport(content, feature.package)) {
            violations.push(`NOT_PURE_REEXPORT:${path.relative(tmpRoot, file)}`);
          }
        } else {
          violations.push(`NON_REEXPORT_FILE:${path.relative(tmpRoot, file)}`);
        }
      }
    }
  }

  if (violations.length === 0) {
    return { passed: true, output: "no violations" };
  }
  return { passed: false, output: violations.join("\n") };
}

describe("check-shared-features", () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ramcar-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  function mkdir(...parts: string[]) {
    const dir = path.join(tmpRoot, ...parts);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  function write(relPath: string, content: string) {
    const abs = path.join(tmpRoot, relPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }

  it("(a) passes when app features dir is empty", async () => {
    mkdir("apps/web/src/features");
    const manifest: Manifest = {
      features: [{ name: "visitors", migratedAt: "2026-04-17", package: "@ramcar/features/visitors" }],
    };
    const result = await runCheck(tmpRoot, manifest);
    expect(result.passed).toBe(true);
  });

  it("(b) fails when a non-reexport file exists", async () => {
    write("apps/web/src/features/visitors/components/my-component.tsx", "export function Foo() {}");
    const manifest: Manifest = {
      features: [{ name: "visitors", migratedAt: "2026-04-17", package: "@ramcar/features/visitors" }],
    };
    const result = await runCheck(tmpRoot, manifest);
    expect(result.passed).toBe(false);
    expect(result.output).toContain("NON_REEXPORT_FILE");
    expect(result.output).toContain("visitors");
  });

  it("(c) passes when index.ts is a pure re-export", async () => {
    write("apps/web/src/features/visitors/index.ts", `export * from "@ramcar/features/visitors";\n`);
    const manifest: Manifest = {
      features: [{ name: "visitors", migratedAt: "2026-04-17", package: "@ramcar/features/visitors" }],
    };
    const result = await runCheck(tmpRoot, manifest);
    expect(result.passed).toBe(true);
  });

  it("(d) passes when an offending path is in the allowList", async () => {
    write("apps/web/src/features/visitors/components/my-component.tsx", "export function Foo() {}");
    const manifest: Manifest = {
      features: [{ name: "visitors", migratedAt: "2026-04-17", package: "@ramcar/features/visitors" }],
      allowList: ["apps/web/src/features/visitors/components/my-component.tsx"],
    };
    const result = await runCheck(tmpRoot, manifest);
    expect(result.passed).toBe(true);
  });

  it("(e) output includes migrated-feature name and target package on failure", async () => {
    write("apps/desktop/src/features/visitors/hooks/bad.ts", "export function bad() {}");
    const manifest: Manifest = {
      features: [{ name: "visitors", migratedAt: "2026-04-17", package: "@ramcar/features/visitors" }],
    };
    const result = await runCheck(tmpRoot, manifest);
    expect(result.passed).toBe(false);
    expect(result.output).toContain("visitors");
  });
});
