import type { VisitPerson } from "../types";
import { VisitPersonStatusBadge } from "./visit-person-status-badge";

interface Column {
  key: string;
  header: string;
  render: (person: VisitPerson) => React.ReactNode;
}

export function getVisitorColumns(t: (key: string) => string): Column[] {
  return [
    { key: "code", header: t("visitPersons.columns.code"), render: (p) => <span className="font-mono text-xs">{p.code}</span> },
    { key: "fullName", header: t("visitPersons.columns.fullName"), render: (p) => p.fullName },
    { key: "status", header: t("visitPersons.columns.status"), render: (p) => <VisitPersonStatusBadge status={p.status} /> },
    { key: "residentName", header: t("visitPersons.columns.residentName"), render: (p) => p.residentName ?? "—" },
  ];
}
