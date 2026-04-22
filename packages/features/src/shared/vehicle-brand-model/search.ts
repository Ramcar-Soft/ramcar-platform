import Fuse from "fuse.js";
import { VEHICLE_BRAND_MODEL } from "./data";

export function normalizeForSearch(s: string): string {
  return s
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function titleCase(s: string): string {
  return s
    .trim()
    .toLocaleLowerCase()
    .replace(/(^|[\s\-/])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase());
}

type BrandItem = { name: string };

let _brandIndex: Fuse<BrandItem> | null = null;

export function buildBrandIndex(): Fuse<BrandItem> {
  if (_brandIndex) return _brandIndex;
  const items: BrandItem[] = Object.keys(VEHICLE_BRAND_MODEL).map((name) => ({ name }));
  _brandIndex = new Fuse(items, {
    keys: ["name"],
    threshold: 0.3,
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength: 2,
  });
  return _brandIndex;
}

export function searchModels(brand: string, query: string): string[] {
  const models = VEHICLE_BRAND_MODEL[brand];
  if (!models) return [];
  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) return [...models].slice(0, 10);

  const startsWith: string[] = [];
  const includes: string[] = [];

  for (const model of models) {
    const normalized = normalizeForSearch(model);
    if (normalized.startsWith(normalizedQuery)) {
      startsWith.push(model);
    } else if (normalized.includes(normalizedQuery)) {
      includes.push(model);
    }
    if (startsWith.length + includes.length >= 10) break;
  }

  return [...startsWith, ...includes].slice(0, 10);
}
