import { COLOR_CATALOG, type ColorEntry } from "./color-catalog";

const HEX_STRICT = /^#[0-9A-F]{6}$/;
const HEX_LENIENT_6 = /^#[0-9A-Fa-f]{6}$/;
const HEX_LENIENT_3 = /^#[0-9A-Fa-f]{3}$/;

const CATALOG_BY_HEX: ReadonlyMap<string, ColorEntry> = new Map(
  COLOR_CATALOG.map((entry) => [entry.hex, entry]),
);

export function normalizeHex(value: string): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  if (HEX_LENIENT_6.test(value)) return value.toUpperCase();
  if (HEX_LENIENT_3.test(value)) {
    const r = value[1]!;
    const g = value[2]!;
    const b = value[3]!;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return null;
}

export function isHex(value: string): boolean {
  return normalizeHex(value) !== null;
}

export function lookupByHex(value: string): ColorEntry | null {
  const hex = normalizeHex(value);
  if (!hex) return null;
  return CATALOG_BY_HEX.get(hex) ?? null;
}

export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function buildSearchToken(input: {
  key: string;
  hex: string;
  en: string;
  es: string;
}): string {
  return [
    input.key,
    normalizeSearch(input.en),
    normalizeSearch(input.es),
    input.hex.toLowerCase(),
  ].join(" ");
}

export const HEX_PATTERN = HEX_STRICT;
