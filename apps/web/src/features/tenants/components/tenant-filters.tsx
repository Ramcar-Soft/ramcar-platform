"use client";

import { forwardRef, useRef } from "react";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ramcar/ui";
import { useTranslations } from "next-intl";

interface TenantFiltersProps {
  search?: string;
  status?: "active" | "inactive" | "all";
  onChange: (partial: { search?: string; status?: "active" | "inactive" | "all" }) => void;
}

export const TenantFilters = forwardRef<HTMLInputElement, TenantFiltersProps>(
  function TenantFilters({ search = "", status = "active", onChange }, ref) {
    const t = useTranslations("tenants");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    function handleSearchChange(value: string) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange({ search: value });
      }, 300);
    }

    return (
      <div className="flex gap-2">
        <Input
          ref={ref}
          placeholder={t("filters.searchPlaceholder")}
          defaultValue={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onValueChange={(val) => onChange({ status: val as typeof status })}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.statusAll")}</SelectItem>
            <SelectItem value="active">{t("filters.statusActive")}</SelectItem>
            <SelectItem value="inactive">{t("filters.statusInactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  },
);
