"use client";

import { Button } from "@ramcar/ui";
import { Pencil } from "lucide-react";
import type { VisitPerson } from "../types";
import { VisitPersonStatusBadge } from "./visit-person-status-badge";

interface ColumnDef {
  key: string;
  header: string;
  render: (person: VisitPerson) => React.ReactNode;
}

interface GetVisitorColumnsOptions {
  onEditPerson?: (person: VisitPerson) => void;
  editLabel?: string;
}

export function getVisitorColumns(
  t: (key: string) => string,
  options: GetVisitorColumnsOptions = {},
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
