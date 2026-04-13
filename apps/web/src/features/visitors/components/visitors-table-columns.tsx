"use client";

import type { VisitPerson } from "../types";
import { VisitPersonStatusBadge } from "./visit-person-status-badge";

interface ColumnDef {
  key: string;
  header: string;
  render: (person: VisitPerson) => React.ReactNode;
}

export function getVisitorColumns(t: (key: string) => string): ColumnDef[] {
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
      key: "status",
      header: t("columns.status"),
      render: (p) => <VisitPersonStatusBadge status={p.status} />,
    },
    {
      key: "resident_name",
      header: t("columns.residentName"),
      render: (p) => p.residentName ?? "—",
    },
  ];
}
