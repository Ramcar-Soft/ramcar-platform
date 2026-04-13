import { Badge, Button } from "@ramcar/ui";
import { Pencil } from "lucide-react";
import type { VisitPerson, VisitPersonStatus } from "../types";

const statusVariantMap: Record<VisitPersonStatus, "default" | "warning" | "destructive"> = {
  allowed: "default",
  flagged: "warning",
  denied: "destructive",
};

interface Column {
  key: string;
  header: string;
  render: (person: VisitPerson) => React.ReactNode;
}

interface ColumnOptions {
  onEditPerson?: (person: VisitPerson) => void;
  editLabel?: string;
}

export function getProviderColumns(
  t: (key: string) => string,
  options: ColumnOptions = {},
): Column[] {
  const base: Column[] = [
    { key: "code", header: t("providers.columns.code"), render: (p) => <span className="font-mono text-xs">{p.code}</span> },
    { key: "fullName", header: t("providers.columns.fullName"), render: (p) => p.fullName },
    { key: "company", header: t("providers.columns.company"), render: (p) => p.company ?? "—" },
    { key: "phone", header: t("providers.columns.phone"), render: (p) => p.phone ?? "—" },
    { key: "status", header: t("providers.columns.status"), render: (p) => <Badge variant={statusVariantMap[p.status]}>{t(`visitPersons.status.${p.status}`)}</Badge> },
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
