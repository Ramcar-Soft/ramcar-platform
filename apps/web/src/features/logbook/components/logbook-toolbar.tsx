"use client";

import { forwardRef } from "react";
import { X, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { ResidentSelect } from "@ramcar/features/shared/resident-select";
import { ShortcutsHint } from "@ramcar/features";
import { DateRangeFilter } from "./date-range-filter";
import { ExportMenu } from "./export-menu";
import type { LogbookFilters } from "../types";

interface LogbookToolbarProps {
  filters: LogbookFilters;
  onFilterChange: (update: Partial<LogbookFilters>) => void;
  onSearchChange: (value: string) => void;
  onResidentChange: (residentId: string | undefined) => void;
  personType: string;
  totalRows?: number;
  onExportAll: () => void;
}

export const LogbookToolbar = forwardRef<HTMLInputElement, LogbookToolbarProps>(
  function LogbookToolbar(
    {
      filters,
      onFilterChange,
      onSearchChange,
      onResidentChange,
      personType,
      totalRows,
      onExportAll,
    },
    ref,
  ) {
    const t = useTranslations("logbook");

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      if (e.key === "Escape") {
        e.currentTarget.value = "";
        onSearchChange("");
      }
    }

    return (
      <div className="flex flex-wrap items-center gap-2">
        <DateRangeFilter filters={filters} onApply={onFilterChange} />
        <div className="w-full sm:w-48">
          <ResidentSelect
            value={filters.residentId ?? ""}
            onChange={(id) => onResidentChange(id || undefined)}
            placeholder={t("toolbar.resident.placeholder")}
          />
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={ref}
            type="text"
            defaultValue={filters.search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("toolbar.search.placeholder")}
            aria-label={t("toolbar.search.ariaLabel")}
            className="h-9 rounded-md border border-input bg-background pl-8 pr-8 text-sm outline-none focus:ring-1 focus:ring-ring w-full sm:w-72"
          />
          {filters.search && (
            <button
              onClick={(e) => {
                const input = e.currentTarget.parentElement?.querySelector("input");
                if (input) input.value = "";
                onSearchChange("");
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={t("toolbar.search.clear")}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="ml-auto w-full sm:w-auto">
          <ExportMenu
            filters={filters}
            personType={personType}
            totalRows={totalRows}
            onExportAll={onExportAll}
          />
        </div>
        <ShortcutsHint search />
      </div>
    );
  },
);
