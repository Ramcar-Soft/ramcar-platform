#!/usr/bin/env node
/**
 * CI Static Analysis — Vehicle Brand Logos (spec 022)
 *
 * Checks C1–C7 from contracts/ci-orphan-check.contract.md:
 *   C1  No brand in VEHICLE_BRAND_MODEL is missing a registry entry.
 *   C2  No orphan registry entry (no key that isn't in VEHICLE_BRAND_MODEL).
 *   C3  No abandoned SVG file in assets/ without a registry entry.
 *   C4  Every referenced asset is ≥ 32 bytes and starts with <svg.
 *   C5  slugify() produces a unique slug for every key in VEHICLE_BRAND_MODEL.
 *   C6  Total assets/ size ≤ 500 KB.
 *   C7  LICENSE-third-party.md exists at repo root and contains "car-logos-dataset".
 *
 * Exits 0 only if all checks pass.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function slugify(canonicalName: string): string {
  return canonicalName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const DATA_TS = path.join(ROOT, "packages/features/src/shared/vehicle-brand-model/data.ts");
const REGISTRY_TS = path.join(ROOT, "packages/features/src/shared/vehicle-brand-logos/logo-registry.ts");
const ASSETS_DIR = path.join(ROOT, "packages/features/src/shared/vehicle-brand-logos/assets");
const LICENSE_FILE = path.join(ROOT, "LICENSE-third-party.md");
const BUDGET_BYTES = 500 * 1024; // 500 KB

interface Violation {
  check: string;
  message: string;
}

const violations: Violation[] = [];

function fail(check: string, message: string) {
  violations.push({ check, message });
}

// ─── Parse VEHICLE_BRAND_MODEL keys from data.ts (regex-based) ───────────────

function parseBrandModelKeys(filePath: string): string[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const keys: string[] = [];
  // Match top-level object keys: e.g.  Nissan: Object.freeze([...])
  // Supports unquoted (Nissan), double-quoted ("Mercedes-Benz"), and
  // single-quoted ('Mercedes-Benz') key forms.
  const keyRegex = /^\s{2}(?:"([^"]+)"|'([^']+)'|([A-Za-z][\w\s-]*)):\s*Object\.freeze/gm;
  let match: RegExpExecArray | null;
  while ((match = keyRegex.exec(content)) !== null) {
    const key = (match[1] ?? match[2] ?? match[3] ?? "").trim();
    if (key) keys.push(key);
  }
  return keys;
}

// ─── Parse BRAND_LOGO_REGISTRY keys from logo-registry.ts (regex-based) ─────

function parseRegistryKeys(filePath: string): string[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const keys: string[] = [];
  // Match registry object keys: e.g. BYD: toUrl(bydLogo) | BYD: bydLogo
  // Supports quoted and unquoted keys; value may be `xxxLogo` or `toUrl(xxxLogo)`.
  const inRegistry = content.indexOf("Object.freeze({");
  if (inRegistry === -1) return keys;
  const registryBody = content.slice(inRegistry);
  const keyRegex = /^\s{2}(?:"([^"]+)"|'([^']+)'|([A-Za-z][\w\s-]*)):\s*(?:toUrl\()?\w+Logo/gm;
  let match: RegExpExecArray | null;
  while ((match = keyRegex.exec(registryBody)) !== null) {
    const key = (match[1] ?? match[2] ?? match[3] ?? "").trim();
    if (key) keys.push(key);
  }
  return keys;
}

// ─── Parse import paths from logo-registry.ts (to map registry key → filename) ─

function parseRegistryImports(filePath: string): Map<string, string> {
  const content = fs.readFileSync(filePath, "utf-8");
  const varToFile = new Map<string, string>();
  const importRegex = /^import\s+(\w+Logo)\s+from\s+"\.\/assets\/([^"]+\.svg)"/gm;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content)) !== null) {
    varToFile.set(match[1], match[2]);
  }
  return varToFile;
}

// Unused: file resolution is done via slugify() against the key, then
// verified against the set of files actually imported in logo-registry.ts.

// ─── Main ─────────────────────────────────────────────────────────────────────

const brandKeys = parseBrandModelKeys(DATA_TS);
const registryKeys = parseRegistryKeys(REGISTRY_TS);
const registryImports = parseRegistryImports(REGISTRY_TS);

// Build registry key → filename map.
// The expected on-disk file for a registry key is `slugify(key).svg`. We then
// verify that file is actually imported by logo-registry.ts (any variable
// name pointing at it counts).
const importedFiles = new Set(registryImports.values());
const registryKeyToFile = new Map<string, string>();
for (const key of registryKeys) {
  const expectedFile = `${slugify(key)}.svg`;
  if (importedFiles.has(expectedFile)) {
    registryKeyToFile.set(key, expectedFile);
  }
}

// C1 — No missing logos (data.ts → registry)
for (const brand of brandKeys) {
  if (!registryKeys.includes(brand)) {
    const slug = slugify(brand);
    fail(
      "C1",
      `✗ Missing logo for brand "${brand}"\n` +
      `  The brand exists in ${path.relative(ROOT, DATA_TS)}\n` +
      `  but no entry exists in ${path.relative(ROOT, REGISTRY_TS)}.\n` +
      `  Action: add an SVG to packages/features/src/shared/vehicle-brand-logos/assets/${slug}.svg\n` +
      `          and a registry entry mapping "${brand}" to it.`
    );
  }
}

// C2 — No orphan logos (registry → data.ts)
for (const key of registryKeys) {
  if (!brandKeys.includes(key)) {
    fail(
      "C2",
      `✗ Orphan logo entry "${key}"\n` +
      `  The registry maps "${key}" to a logo asset, but "${key}" does not appear in\n` +
      `  ${path.relative(ROOT, DATA_TS)}.\n` +
      `  Action: either add "${key}" to VEHICLE_BRAND_MODEL or remove the registry entry\n` +
      `          and the asset file.`
    );
  }
}

// C3 — No abandoned files (filesystem → registry)
const assetFiles = fs.readdirSync(ASSETS_DIR).filter((f) => f.endsWith(".svg"));
const referencedFiles = new Set(registryKeyToFile.values());

for (const file of assetFiles) {
  if (!referencedFiles.has(file)) {
    fail(
      "C3",
      `✗ Abandoned asset ${file}\n` +
      `  The file exists in assets/ but is not imported by logo-registry.ts.\n` +
      `  Action: import and reference it in the registry, or delete the file.`
    );
  }
}

// C4 — File sanity (≥ 32 bytes, starts with <svg)
for (const file of referencedFiles) {
  const filePath = path.join(ASSETS_DIR, file);
  if (!fs.existsSync(filePath)) {
    fail(
      "C4",
      `✗ Corrupted or wrong-format asset ${file}\n` +
      `  File is referenced in logo-registry.ts but does not exist on disk.\n` +
      `  Action: add ${file} to packages/features/src/shared/vehicle-brand-logos/assets/ or remove the registry entry.`
    );
    continue;
  }

  const stat = fs.statSync(filePath);
  if (stat.size < 32) {
    fail(
      "C4",
      `✗ Corrupted or wrong-format asset ${file}\n` +
      `  File is too small (${stat.size} bytes < 32 bytes).\n` +
      `  Action: re-export the asset from the source dataset and re-commit.`
    );
    continue;
  }

  const buf = Buffer.alloc(64);
  const fd = fs.openSync(filePath, "r");
  fs.readSync(fd, buf, 0, 64, 0);
  fs.closeSync(fd);

  // Strip UTF-8 BOM if present
  let offset = 0;
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) offset = 3;
  const prefix = buf.slice(offset, offset + 4).toString("utf-8");

  if (prefix !== "<svg") {
    fail(
      "C4",
      `✗ Corrupted or wrong-format asset ${file}\n` +
      `  File does not start with "<svg" (got: "${prefix}").\n` +
      `  Action: re-export the asset from the source dataset and re-commit.`
    );
  }
}

// C5 — Slug uniqueness
const slugs = brandKeys.map((b) => ({ brand: b, slug: slugify(b) }));
const slugMap = new Map<string, string>();
for (const { brand, slug } of slugs) {
  if (slugMap.has(slug)) {
    fail(
      "C5",
      `✗ Slug collision: "${slugMap.get(slug)}" and "${brand}" both slugify to "${slug}"\n` +
      `  Action: choose a different canonical name in data.ts for one of the brands,\n` +
      `          or extend the slug strategy in slugify.ts (and add a test for the new rule).`
    );
  } else {
    slugMap.set(slug, brand);
  }
}

// C6 — Asset budget
let totalBytes = 0;
const fileSizes: Array<{ file: string; size: number }> = [];
for (const file of assetFiles) {
  const size = fs.statSync(path.join(ASSETS_DIR, file)).size;
  totalBytes += size;
  fileSizes.push({ file, size });
}

if (totalBytes > BUDGET_BYTES) {
  fileSizes.sort((a, b) => b.size - a.size);
  const top3 = fileSizes.slice(0, 3);
  fail(
    "C6",
    `✗ Asset bundle exceeds budget: ${Math.round(totalBytes / 1024)} KB > 500 KB\n` +
    `  Files contributing the most:\n` +
    top3.map((f) => `    - ${f.file} (${Math.round(f.size / 1024)} KB)`).join("\n") +
    `\n  Action: re-export the listed assets at icon scale or revisit the budget in research.md §8.`
  );
}

// C7 — Attribution presence
if (!fs.existsSync(LICENSE_FILE)) {
  fail(
    "C7",
    `✗ Missing third-party license attribution\n` +
    `  LICENSE-third-party.md is absent at repo root.\n` +
    `  Action: ensure the MIT notice from filippofilip95/car-logos-dataset is preserved\n` +
    `          in LICENSE-third-party.md (see spec 022 research.md §11).`
  );
} else {
  const licenseContent = fs.readFileSync(LICENSE_FILE, "utf-8");
  if (!licenseContent.includes("car-logos-dataset")) {
    fail(
      "C7",
      `✗ Missing third-party license attribution\n` +
      `  LICENSE-third-party.md exists but does not contain "car-logos-dataset".\n` +
      `  Action: ensure the MIT notice from filippofilip95/car-logos-dataset is preserved\n` +
      `          in LICENSE-third-party.md (see spec 022 research.md §11).`
    );
  }
}

// ─── Results ─────────────────────────────────────────────────────────────────

if (violations.length === 0) {
  const totalKb = Math.round(totalBytes / 1024);
  console.log("✓ vehicle-brand-logos check");
  console.log(`  • ${brandKeys.length} brands, ${registryKeys.length} logos — registry complete & closed`);
  console.log(`  • assets/ size ${totalKb} KB / 500 KB budget`);
  console.log("  • LICENSE-third-party.md OK");
  process.exit(0);
}

console.error(`\n✗ vehicle-brand-logos: ${violations.length} violation(s) found\n`);
const sorted = [...violations].sort((a, b) => a.check.localeCompare(b.check));
for (const v of sorted) {
  console.error(v.message);
  console.error();
}
process.exit(1);
