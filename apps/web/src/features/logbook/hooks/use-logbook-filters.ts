"use client";

import { useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { LogbookFilters } from "../types";

const PAGE_SIZE_VALUES: readonly number[] = [10, 25, 50, 100];
const SEARCH_DEBOUNCE_MS = 300;
const VALID_PRESETS = [
  "today",
  "last_7d",
  "last_30d",
  "last_90d",
  "custom",
] as const;

export function parseFilters(params: URLSearchParams): LogbookFilters {
  const presetRaw = params.get("date_preset");
  const preset = (VALID_PRESETS as readonly string[]).includes(presetRaw ?? "")
    ? (presetRaw as LogbookFilters["datePreset"])
    : "today";

  const pageSizeRaw = Number(params.get("page_size"));
  const pageSize = (
    PAGE_SIZE_VALUES.includes(pageSizeRaw) ? pageSizeRaw : 25
  ) as LogbookFilters["pageSize"];

  return {
    datePreset: preset,
    dateFrom: params.get("date_from") ?? undefined,
    dateTo: params.get("date_to") ?? undefined,
    tenantId: params.get("tenant_id") ?? undefined,
    residentId: params.get("resident_id") ?? undefined,
    search: params.get("search") ?? undefined,
    page: Math.max(1, Number(params.get("page")) || 1),
    pageSize,
  };
}

export function buildUrl(pathname: string, filters: LogbookFilters): string {
  const params = new URLSearchParams();
  if (filters.datePreset !== "today")
    params.set("date_preset", filters.datePreset);
  if (filters.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters.dateTo) params.set("date_to", filters.dateTo);
  if (filters.tenantId) params.set("tenant_id", filters.tenantId);
  if (filters.residentId) params.set("resident_id", filters.residentId);
  if (filters.search) params.set("search", filters.search);
  if (filters.page !== 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 25)
    params.set("page_size", String(filters.pageSize));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function useLogbookFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const filters = parseFilters(
    new URLSearchParams(searchParams?.toString() ?? ""),
  );

  const setFilters = useCallback(
    (
      updater:
        | Partial<LogbookFilters>
        | ((prev: LogbookFilters) => Partial<LogbookFilters>),
    ) => {
      const currentFilters = parseFilters(
        new URLSearchParams(window.location.search),
      );
      const partial =
        typeof updater === "function" ? updater(currentFilters) : updater;
      const isPageOnly =
        Object.keys(partial).length === 1 && "page" in partial;
      const next: LogbookFilters = {
        ...currentFilters,
        ...partial,
        page: isPageOnly ? (partial.page ?? currentFilters.page) : 1,
      };
      router.replace(buildUrl(pathname, next), { scroll: false });
    },
    [router, pathname],
  );

  const setSearch = useCallback(
    (value: string) => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        setFilters({ search: value || undefined });
      }, SEARCH_DEBOUNCE_MS);
    },
    [setFilters],
  );

  return { filters, setFilters, setSearch };
}
