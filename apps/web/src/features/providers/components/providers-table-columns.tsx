"use client";

import { Badge, Button } from "@ramcar/ui";
import { Pencil } from "lucide-react";
import { PlatesCell } from "@ramcar/features/shared";
import type { VisitPerson, VisitPersonStatus } from "../types";

const statusVariantMap: Record<VisitPersonStatus, "default" | "destructive" | "warning"> = {
  allowed: "default",
  flagged: "warning",
  denied: "destructive",
};

interface ColumnDef {
  key: string;
  header: string;
  render: (person: VisitPerson) => React.ReactNode;
}

interface GetProviderColumnsOptions {
  onEditPerson?: (person: VisitPerson) => void;
  editLabel?: string;
}

export function getProviderColumns(
  t: (key: string) => string,
  tStatus: (key: string) => string,
  options: GetProviderColumnsOptions = {},
): ColumnDef[] {
  const columns: ColumnDef[] = [
    {
      key: "code",
      header: t("columns.code"),
      render: (p) => <span className="font-mono text-xs">{p.code}</span>,
    },
    {
      key: "full_name",
      header: t("columns.fullName"),
      render: (p) => <span className="font-medium">{p.fullName}</span>,
    },
    {
      key: "company",
      header: t("columns.company"),
      render: (p) => p.company ?? "—",
    },
    {
      key: "phone",
      header: t("columns.phone"),
      render: (p) => p.phone ?? "—",
    },
    {
      key: "status",
      header: t("columns.status"),
      render: (p) => (
        <Badge variant={statusVariantMap[p.status]}>{tStatus(p.status)}</Badge>
      ),
    },
    {
      key: "resident_address",
      header: t("columns.residentAddress"),
      render: (p) => (
        <span className="text-sm">{p.residentAddress ?? "—"}</span>
      ),
    },
    {
      key: "plates",
      header: t("columns.plates"),
      render: (p) => <PlatesCell plates={p.vehiclePlates} />,
    },
  ];

  if (options.onEditPerson) {
    columns.push({
      key: "actions",
      header: t("columns.edit"),
      render: (p) => (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={options.editLabel}
            onClick={(e) => {
              e.stopPropagation();
              options.onEditPerson?.(p);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      ),
    });
  }

  return columns;
}
