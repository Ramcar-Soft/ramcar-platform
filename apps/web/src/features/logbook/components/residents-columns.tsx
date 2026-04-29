"use client";

import { Badge } from "@ramcar/ui";
import { VehicleBrandLogo } from "@ramcar/features/shared";
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

function VehicleCell({ item }: { item: AccessEventListItem }) {
  if (item.accessMode !== "vehicle" || !item.vehicle) return null;
  const plate = item.vehicle.plate ?? "";
  const brand = item.vehicle.brand ?? "";
  const label = plate && brand ? `${plate} — ${brand}` : plate || brand || "";
  if (!label) return null;
  return (
    <span className="flex items-center gap-2">
      <VehicleBrandLogo brand={item.vehicle.brand ?? null} />
      <span>{label}</span>
    </span>
  );
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
      cell: (item) => <VehicleCell item={item} />,
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
