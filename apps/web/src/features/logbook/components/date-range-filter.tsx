"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button, Popover, PopoverContent, PopoverTrigger } from "@ramcar/ui";
import { useTranslations } from "next-intl";
import { useDatePresets } from "../hooks/use-date-presets";
import type { LogbookFilters } from "../types";

interface DateRangeFilterProps {
  filters: LogbookFilters;
  onApply: (update: Partial<LogbookFilters>) => void;
}

export function DateRangeFilter({ filters, onApply }: DateRangeFilterProps) {
  const t = useTranslations("logbook");
  const { getPresetRange } = useDatePresets();
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(filters.dateFrom ?? "");
  const [customTo, setCustomTo] = useState(filters.dateTo ?? "");
  const [rangeError, setRangeError] = useState("");

  const presets = [
    { value: "today" as const, label: t("presets.today") },
    { value: "last_7d" as const, label: t("presets.last_7d") },
    { value: "last_30d" as const, label: t("presets.last_30d") },
    { value: "last_90d" as const, label: t("presets.last_90d") },
    { value: "custom" as const, label: t("presets.custom") },
  ];

  const triggerLabel =
    presets.find((p) => p.value === filters.datePreset)?.label ??
    t("presets.today");

  function handlePreset(preset: LogbookFilters["datePreset"]) {
    if (preset === "custom") {
      onApply({ datePreset: "custom" });
      return;
    }
    const range = getPresetRange(preset);
    onApply({
      datePreset: preset,
      dateFrom: range?.from,
      dateTo: range?.to,
    });
    setOpen(false);
  }

  function handleApplyCustom() {
    if (customFrom && customTo && customTo < customFrom) {
      setRangeError(t("toolbar.dateRange.invalidRange"));
      return;
    }
    setRangeError("");
    onApply({
      datePreset: "custom",
      dateFrom: customFrom || undefined,
      dateTo: customTo || undefined,
    });
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarIcon className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="flex flex-col gap-1">
          {presets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => handlePreset(preset.value)}
              className={`rounded px-3 py-2 text-sm text-left hover:bg-muted ${
                filters.datePreset === preset.value
                  ? "bg-muted font-medium"
                  : ""
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {filters.datePreset === "custom" && (
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="flex-1 rounded border px-2 py-1 text-sm"
              />
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="flex-1 rounded border px-2 py-1 text-sm"
              />
            </div>
            {rangeError && (
              <p className="text-xs text-destructive">{rangeError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
              >
                {t("toolbar.dateRange.cancel")}
              </Button>
              <Button size="sm" onClick={handleApplyCustom}>
                {t("toolbar.dateRange.apply")}
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
