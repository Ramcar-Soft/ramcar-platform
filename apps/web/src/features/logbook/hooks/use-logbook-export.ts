"use client";

import { useState } from "react";
import { apiClient } from "@/shared/lib/api-client";
import type { LogbookFilters } from "../types";

interface UseLogbookExportReturn {
  isExporting: boolean;
  error: Error | null;
  exportCurrentView: (
    filters: LogbookFilters,
    personType: string,
    locale: string,
  ) => Promise<void>;
}

export function useLogbookExport(): UseLogbookExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function exportCurrentView(
    filters: LogbookFilters,
    personType: string,
    locale: string,
  ): Promise<void> {
    setIsExporting(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {
        personType,
        locale,
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(filters.tenantId && { tenantId: filters.tenantId }),
        ...(filters.residentId && { residentId: filters.residentId }),
        ...(filters.search && { search: filters.search }),
      };

      const { blob, filename } = await apiClient.download(
        "/access-events/export",
        { params },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Export failed"));
    } finally {
      setIsExporting(false);
    }
  }

  return { isExporting, error, exportCurrentView };
}
