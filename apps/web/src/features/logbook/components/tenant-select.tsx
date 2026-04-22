"use client";

import { useTranslations } from "next-intl";
import { useAppStore } from "@ramcar/store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ramcar/ui";
import { useTenants } from "../hooks/use-tenants";

interface TenantSelectProps {
  value: string | undefined;
  onChange: (tenantId: string | undefined) => void;
}

const ALL_SENTINEL = "ALL";

export function TenantSelect({ value, onChange }: TenantSelectProps) {
  const t = useTranslations("logbook");
  const user = useAppStore((s) => s.user);
  const { data: tenants } = useTenants();

  if (!["super_admin", "admin"].includes(user?.role || "")) return null;

  return (
    <Select
      value={value ?? ALL_SENTINEL}
      onValueChange={(v) => onChange(v === ALL_SENTINEL ? undefined : v)}
    >
      <SelectTrigger className="h-9 w-48">
        <SelectValue placeholder={t("toolbar.tenantSelect.placeholder")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_SENTINEL}>
          {t("toolbar.tenantSelect.allOption")}
        </SelectItem>
        {tenants?.map((tenant) => (
          <SelectItem key={tenant.id} value={tenant.id}>
            {tenant.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
