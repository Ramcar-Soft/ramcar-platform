import { Badge } from "@ramcar/ui";
import type { VisitPerson, VisitPersonStatus } from "../types";

const statusVariantMap: Record<VisitPersonStatus, "default" | "secondary" | "destructive"> = {
  allowed: "default",
  flagged: "secondary",
  denied: "destructive",
};

interface Column {
  key: string;
  header: string;
  render: (person: VisitPerson) => React.ReactNode;
}

export function getProviderColumns(
  t: (key: string) => string,
): Column[] {
  return [
    { key: "code", header: t("providers.columns.code"), render: (p) => <span className="font-mono text-xs">{p.code}</span> },
    { key: "fullName", header: t("providers.columns.fullName"), render: (p) => p.fullName },
    { key: "company", header: t("providers.columns.company"), render: (p) => p.company ?? "—" },
    { key: "phone", header: t("providers.columns.phone"), render: (p) => p.phone ?? "—" },
    { key: "status", header: t("providers.columns.status"), render: (p) => <Badge variant={statusVariantMap[p.status]}>{t(`visitPersons.status.${p.status}`)}</Badge> },
  ];
}
