import { normalizeForSearch } from "../vehicle-brand-model/search";
import { BRAND_LOGO_REGISTRY } from "./logo-registry";

const _normalizedIndex = new Map<string, string>();
for (const [brand, url] of Object.entries(BRAND_LOGO_REGISTRY)) {
  _normalizedIndex.set(normalizeForSearch(brand), url);
}

export function getBrandLogoUrl(brand: string | null | undefined): string | null {
  if (brand == null) return null;
  const normalized = normalizeForSearch(brand);
  if (!normalized) return null;
  return _normalizedIndex.get(normalized) ?? null;
}
