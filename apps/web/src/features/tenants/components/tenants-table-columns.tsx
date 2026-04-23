"use client";

import { Button, TenantAvatar } from "@ramcar/ui";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { TenantStatusBadge } from "./tenant-status-badge";
import type { Tenant } from "../types";

interface ColumnConfig {
  key: string;
  header: string;
  cell: (tenant: Tenant) => React.ReactNode;
}

export function useTenantsTableColumns(onEdit: (tenant: Tenant) => void): ColumnConfig[] {
  const t = useTranslations("tenants");

  return [
    {
      key: "name",
      header: t("table.columns.name"),
      cell: (tenant) => (
        <div className="flex items-center gap-2">
          <TenantAvatar name={tenant.name} slug={tenant.slug} imagePath={tenant.image_path} supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""} size="sm" />
          <span className="font-medium">{tenant.name}</span>
        </div>
      ),
    },
    {
      key: "address",
      header: t("table.columns.address"),
      cell: (tenant) => <span className="text-muted-foreground text-sm">{tenant.address}</span>,
    },
    {
      key: "status",
      header: t("table.columns.status"),
      cell: (tenant) => <TenantStatusBadge status={tenant.status} />,
    },
    {
      key: "createdAt",
      header: t("table.columns.createdAt"),
      cell: (tenant) => (
        <span className="text-muted-foreground text-sm">
          {new Date(tenant.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("table.columns.actions"),
      cell: (tenant) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(tenant);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];
}
