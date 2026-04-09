"use client";

import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ramcar/ui";
import { useTranslations } from "next-intl";
import { useAppStore } from "@ramcar/store";
import type { UserFilters, UserStatus } from "../types";

interface UserFiltersProps {
  filters: UserFilters;
  onFiltersChange: (filters: Partial<UserFilters>) => void;
  tenants?: { id: string; name: string }[];
}

export function UserFiltersBar({ filters, onFiltersChange, tenants }: UserFiltersProps) {
  const t = useTranslations("users");
  const user = useAppStore((s) => s.user);
  const isSuperAdmin = user?.role === "super_admin";

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <Input
        placeholder={t("searchPlaceholder")}
        value={filters.search ?? ""}
        onChange={(e) => onFiltersChange({ search: e.target.value, page: 1 })}
        className="max-w-sm"
      />
      {isSuperAdmin && tenants && (
        <Select
          value={filters.tenantId ?? "all"}
          onValueChange={(value) =>
            onFiltersChange({ tenantId: value === "all" ? undefined : value, page: 1 })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t("filterByTenant")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allTenants")}</SelectItem>
            {tenants.map((tenant) => (
              <SelectItem key={tenant.id} value={tenant.id}>
                {tenant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select
        value={filters.status ?? "all"}
        onValueChange={(value) =>
          onFiltersChange({
            status: value === "all" ? undefined : (value as UserStatus),
            page: 1,
          })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder={t("filterByStatus")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allStatuses")}</SelectItem>
          <SelectItem value="active">{t("status.active")}</SelectItem>
          <SelectItem value="inactive">{t("status.inactive")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
