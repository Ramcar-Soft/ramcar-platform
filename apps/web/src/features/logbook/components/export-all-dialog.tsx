"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ramcar/ui";
import { useLocale, useTranslations } from "next-intl";
import { DateRangeFilter } from "./date-range-filter";
import { useLogbookExport } from "../hooks/use-logbook-export";
import type { LogbookFilters } from "../types";

interface ExportAllDialogProps {
  open: boolean;
  onClose: () => void;
  personType: string;
}

const EMPTY_FILTERS: LogbookFilters = {
  datePreset: "custom",
  page: 1,
  pageSize: 25,
};

export function ExportAllDialog({
  open,
  onClose,
  personType,
}: ExportAllDialogProps) {
  const t = useTranslations("logbook");
  const locale = useLocale();
  const { isExporting, exportCurrentView } = useLogbookExport();
  const [modalFilters, setModalFilters] =
    useState<LogbookFilters>(EMPTY_FILTERS);
  const [rangeError, setRangeError] = useState("");

  useEffect(() => {
    if (open) {
      setModalFilters(EMPTY_FILTERS);
      setRangeError("");
    }
  }, [open]);

  async function handleExport() {
    if (!modalFilters.dateFrom && !modalFilters.dateTo) {
      setRangeError(t("export.allRequireRange"));
      return;
    }
    setRangeError("");
    await exportCurrentView(
      {
        ...modalFilters,
        residentId: undefined,
        search: undefined,
      },
      personType,
      locale,
    );
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("export.allTitle")}</DialogTitle>
          <DialogDescription>{t("export.allDescription")}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <DateRangeFilter
            filters={modalFilters}
            onApply={(update) =>
              setModalFilters((prev) => ({ ...prev, ...update }))
            }
          />
          {rangeError && (
            <p className="mt-2 text-sm text-destructive">{rangeError}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("export.cancel")}
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? t("export.generating") : t("export.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
