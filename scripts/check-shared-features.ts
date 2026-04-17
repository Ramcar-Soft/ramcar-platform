#!/usr/bin/env node
/**
 * CI Duplication Check — driven by shared-features.json
 *
 * Scans apps/web/src/features/<name>/ and apps/desktop/src/features/<name>/
 * for each migrated feature. Permits ONLY index.ts files that are a single
 * pure re-export (`export * from "@ramcar/features/<name>"`).
 *
 * Exits non-zero with an actionable error when a violation is found.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const ROOT = path.resolve(__dirname, "..");

function loadManifest(): Manifest {
  const manifestPath = path.join(ROOT, "shared-features.json");
  if (!fs.existsSync(manifestPath)) {
    console.error("ERROR: shared-features.json not found at repo root.");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as Manifest;
}

function isPureReexport(filePath: string, featurePkg: string): boolean {
  const content = fs.readFileSync(filePath, "utf-8").trim();
  const pattern = /^export\s*\*\s*from\s*["'](@ramcar\/features[^"']*?)["'];?\s*$/;
  const match = pattern.exec(content);
  if (!match) return false;
  const importedPkg = match[1];
  return importedPkg === featurePkg || importedPkg.startsWith(`${featurePkg}/`);
}

interface Violation {
  path: string;
  feature: string;
  pkg: string;
  reason: string;
}

async function main() {
  const manifest = loadManifest();
  const allowList = (manifest.allowList ?? []).map((p) => path.join(ROOT, p));
  const violations: Violation[] = [];

  for (const feature of manifest.features) {
    for (const app of ["web", "desktop"]) {
      const featureDir = path.join(ROOT, "apps", app, "src", "features", feature.name);

      if (!fs.existsSync(featureDir)) continue;

      const files = await glob(`${featureDir}/**/*.{ts,tsx}`, {
        absolute: true,
        nodir: true,
      });

      for (const file of files) {
        if (allowList.some((al) => file.startsWith(al) || file === al)) continue;

        const relPath = path.relative(ROOT, file);
        const basename = path.basename(file);

        if (basename === "index.ts" || basename === "index.tsx") {
          if (!isPureReexport(file, feature.package)) {
            violations.push({
              path: relPath,
              feature: feature.name,
              pkg: feature.package,
              reason: `index file is not a pure re-export of "${feature.package}"`,
            });
          }
        } else {
          violations.push({
            path: relPath,
            feature: feature.name,
            pkg: feature.package,
            reason: `non-reexport file found under apps/${app}/src/features/${feature.name}/`,
          });
        }
      }
    }
  }

  if (violations.length === 0) {
    console.log("✓ check-shared-features: no violations found.");
    process.exit(0);
  }

  console.error("✗ check-shared-features: duplication violations detected!\n");
  for (const v of violations) {
    console.error(`  FILE:    ${v.path}`);
    console.error(`  FEATURE: ${v.feature} (migrated to ${v.pkg})`);
    console.error(`  REASON:  ${v.reason}`);
    console.error(`  FIX:     Move code to packages/features/src/${v.feature}/ or delete.`);
    console.error(`  REF:     specs/014-cross-app-code-sharing/\n`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error("check-shared-features crashed:", err);
  process.exit(1);
});
