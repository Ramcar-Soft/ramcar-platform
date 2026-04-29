"use client";

import { Badge } from "@ramcar/ui";
import type { AccessEventListItem } from "@ramcar/shared";
import type { LogbookColumn } from "../types";
import { NotesCell } from "./notes-cell";

type Translator = (key: string) => string;

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function DirectionBadge({
  direction,
  t,
}: {
  direction: "entry" | "exit";
  t: Translator;
}) {
  return (
    <Badge variant={direction === "entry" ? "default" : "secondary"}>
      {t(`direction.${direction}`)}
    </Badge>
  );
}

function vehicleLabel(item: AccessEventListItem): string {
  if (item.accessMode !== "vehicle" || !item.vehicle) return "";
  const plate = item.vehicle.plate ?? "";
  const brand = item.vehicle.brand ?? "";
  if (plate && brand) return `${plate} — ${brand}`;
  return plate || brand || "";
}

export function getResidentsColumns(
  t: Translator,
  locale: string,
): LogbookColumn[] {
  return [
    {
      id: "name",
      header: t("columns.name"),
      cell: (item) => item.resident?.fullName ?? "—",
    },
    {
      id: "unit",
      header: t("columns.unit"),
      cell: (item) => item.resident?.unit ?? "—",
    },
    {
      id: "direction",
      header: t("columns.direction"),
      cell: (item) => <DirectionBadge direction={item.direction} t={t} />,
    },
    {
      id: "mode",
      header: t("columns.mode"),
      cell: (item) => t(`mode.${item.accessMode}`),
    },
    {
      id: "vehicle",
      header: t("columns.vehicle"),
      cell: (item) => vehicleLabel(item),
    },
    {
      id: "registeredBy",
      header: t("columns.registeredBy"),
      cell: (item) => item.registeredBy.fullName || "—",
    },
    {
      id: "notes",
      header: t("columns.notes"),
      cell: (item) => <NotesCell notes={item.notes} />,
    },
    {
      id: "date",
      header: t("columns.date"),
      cell: (item) => formatDate(item.createdAt, locale),
    },
  ];
}
