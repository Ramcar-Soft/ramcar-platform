import { Button } from "@ramcar/ui";
import { Pencil } from "lucide-react";
import type { VisitPerson } from "../types";
import { VisitPersonStatusBadge } from "./visit-person-status-badge";

interface Column {
  key: string;
  header: string;
  render: (person: VisitPerson) => React.ReactNode;
}

interface ColumnOptions {
  onEditPerson?: (person: VisitPerson) => void;
  editLabel?: string;
}

export function getVisitorColumns(
  t: (key: string) => string,
  options: ColumnOptions = {},
): Column[] {
  const base: Column[] = [
    { key: "code", header: t("visitPersons.columns.code"), render: (p) => <span className="font-mono text-xs">{p.code}</span> },
    { key: "fullName", header: t("visitPersons.columns.fullName"), render: (p) => p.fullName },
    { key: "status", header: t("visitPersons.columns.status"), render: (p) => <VisitPersonStatusBadge status={p.status} /> },
    { key: "residentName", header: t("visitPersons.columns.residentName"), render: (p) => p.residentName ?? "—" },
  ];

  if (options.onEditPerson) {
    const onEdit = options.onEditPerson;
    base.push({
      key: "actions",
      header: t("columns.edit"),
      render: (p) => (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={options.editLabel}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(p);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    });
  }

  return base;
}
