"use client";

import { useEffect, useRef, useState } from "react";
import { DownloadIcon, ChevronDownIcon } from "lucide-react";
import { Button } from "@ramcar/ui";
import { useLocale, useTranslations } from "next-intl";
import { useLogbookExport } from "../hooks/use-logbook-export";
import type { LogbookFilters } from "../types";

interface ExportMenuProps {
  filters: LogbookFilters;
  personType: string;
  totalRows?: number;
  onExportAll: () => void;
}

export function ExportMenu({
  filters,
  personType,
  totalRows = 0,
  onExportAll,
}: ExportMenuProps) {
  const t = useTranslations("logbook");
  const locale = useLocale();
  const { isExporting, exportCurrentView } = useLogbookExport();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const noRows = totalRows === 0;

  // Close the menu when clicking outside.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <DownloadIcon className="h-4 w-4" />
        {t("export.menu.trigger")}
        <ChevronDownIcon className="h-3 w-3" />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-1 w-56 rounded-md border bg-popover shadow-md"
        >
          <button
            role="menuitem"
            type="button"
            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            disabled={noRows || isExporting}
            onClick={() => {
              setOpen(false);
              void exportCurrentView(filters, personType, locale);
            }}
          >
            {noRows
              ? t("export.noRows")
              : isExporting
                ? t("export.generating")
                : t("export.menu.current")}
          </button>
          <button
            role="menuitem"
            type="button"
            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => {
              setOpen(false);
              onExportAll();
            }}
          >
            {t("export.menu.all")}
          </button>
        </div>
      )}
    </div>
  );
}
