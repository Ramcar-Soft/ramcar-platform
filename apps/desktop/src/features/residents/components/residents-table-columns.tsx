import { Badge } from "@ramcar/ui";
import type { ExtendedUserProfile } from "@ramcar/shared";

interface ColumnDef {
  key: string;
  header: string;
  render: (resident: ExtendedUserProfile) => React.ReactNode;
}

export function getResidentColumns(t: (key: string) => string): ColumnDef[] {
  return [
    {
      key: "full_name",
      header: t("residents.columns.fullName"),
      render: (r) => <span className="font-medium">{r.fullName}</span>,
    },
    {
      key: "email",
      header: t("residents.columns.email"),
      render: (r) => r.email,
    },
    {
      key: "phone",
      header: t("residents.columns.phone"),
      render: (r) => r.phone ?? "—",
    },
    {
      key: "address",
      header: t("residents.columns.address"),
      render: (r) => r.address ?? "—",
    },
    {
      key: "status",
      header: t("residents.columns.status"),
      render: (r) => (
        <Badge variant={r.status === "active" ? "default" : "secondary"}>
          {r.status}
        </Badge>
      ),
    },
  ];
}
