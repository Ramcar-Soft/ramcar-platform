"use client";

import { Badge } from "@ramcar/ui";
import type { ExtendedUserProfile } from "../types";

interface ColumnDef {
  key: string;
  header: string;
  render: (resident: ExtendedUserProfile) => React.ReactNode;
}

export function getResidentColumns(t: (key: string) => string): ColumnDef[] {
  return [
    {
      key: "full_name",
      header: t("columns.fullName"),
      render: (r) => <span className="font-medium">{r.fullName}</span>,
    },
    {
      key: "email",
      header: t("columns.email"),
      render: (r) => r.email,
    },
    {
      key: "phone",
      header: t("columns.phone"),
      render: (r) => r.phone ?? "—",
    },
    {
      key: "address",
      header: t("columns.address"),
      render: (r) => r.address ?? "—",
    },
    {
      key: "status",
      header: t("columns.status"),
      render: (r) => (
        <Badge variant={r.status === "active" ? "default" : "secondary"}>
          {r.status === "active" ? t("columns.status") : r.status}
        </Badge>
      ),
    },
  ];
}
