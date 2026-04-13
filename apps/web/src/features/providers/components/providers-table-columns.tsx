"use client";

import type { VisitPerson, VisitPersonStatus } from "../types";
import { Badge } from "@ramcar/ui";

const statusVariantMap: Record<VisitPersonStatus, "default" | "destructive" | "secondary"> = {
  allowed: "default",
  flagged: "secondary",
  denied: "destructive",
};

interface ColumnDef {
  key: string;
  header: string;
  render: (person: VisitPerson) => React.ReactNode;
}

export function getProviderColumns(
  t: (key: string) => string,
  tStatus: (key: string) => string,
): ColumnDef[] {
  return [
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
        <Badge variant={statusVariantMap[p.status]}>
          {tStatus(p.status)}
        </Badge>
      ),
    },
  ];
}
