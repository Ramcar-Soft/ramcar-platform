"use client";

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
      render: (r) => r.email ?? "",
    },
    {
      key: "phone",
      header: t("columns.phone"),
      render: (r) => r.phone ? <a className="text-blue-700 underline" href={`tel:${r.phone}`}>{r.phone}</a> : "—",
    },
    {
      key: "address",
      header: t("columns.address"),
      render: (r) => r.address ?? "—",
    },
  ];
}
