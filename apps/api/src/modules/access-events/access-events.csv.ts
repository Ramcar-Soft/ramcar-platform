import type { AccessEventListItem, LogbookLocale } from "@ramcar/shared";
import { LOGBOOK_CSV_LABELS } from "@ramcar/shared";

/**
 * RFC 4180 field quoting plus a CSV-injection defence.
 *
 * - Cells starting with `=`, `+`, `-`, or `@` are prefixed with `'` so that a
 *   spreadsheet does not evaluate them as formulas.
 * - Fields containing `,`, `"`, or `\n` are wrapped in double quotes; embedded
 *   double quotes are escaped by doubling.
 */
export function quoteField(value: string): string {
  let out = value ?? "";
  if (/^[=+\-@]/.test(out)) {
    out = `'${out}`;
  }
  if (/[,"\n\r]/.test(out)) {
    out = `"${out.replace(/"/g, '""')}"`;
  }
  return out;
}

export function rowToCsv(fields: string[]): string {
  return fields.map(quoteField).join(",") + "\r\n";
}

function getSubpage(
  personType: string,
): "visitors" | "providers" | "residents" {
  if (personType === "service_provider") return "providers";
  if (personType === "resident") return "residents";
  return "visitors";
}

function formatDate(isoStr: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(isoStr));
}

function formatVehicle(item: AccessEventListItem): string {
  if (item.accessMode !== "vehicle" || !item.vehicle) return "";
  const plate = item.vehicle.plate ?? "";
  const brand = item.vehicle.brand ?? "";
  if (plate && brand) return `${plate} — ${brand}`;
  return plate || brand;
}

export function getHeaderRow(
  personType: string,
  locale: LogbookLocale,
  showTenant: boolean,
): string {
  const subpage = getSubpage(personType);
  const labels = LOGBOOK_CSV_LABELS[locale];
  const columns: string[] = [...labels[subpage].columns];
  if (showTenant) columns.unshift("Tenant");
  return rowToCsv(columns);
}

export function itemToRow(
  item: AccessEventListItem,
  personType: string,
  locale: LogbookLocale,
  showTenant: boolean,
): string {
  const subpage = getSubpage(personType);
  const labels = LOGBOOK_CSV_LABELS[locale];
  const direction =
    labels.direction[item.direction as keyof typeof labels.direction] ??
    item.direction;
  const vehicle = formatVehicle(item);

  let fields: string[];
  if (subpage === "visitors") {
    fields = [
      item.visitPerson?.code ?? "",
      item.visitPerson?.fullName ?? "",
      direction,
      item.visitPerson?.residentFullName ?? "",
      vehicle,
      item.visitPerson
        ? labels.status[
            item.visitPerson.status as keyof typeof labels.status
          ] ?? ""
        : "",
      item.registeredBy.fullName,
      item.notes ?? "",
      formatDate(item.createdAt),
    ];
  } else if (subpage === "providers") {
    fields = [
      item.visitPerson?.code ?? "",
      item.visitPerson?.fullName ?? "",
      item.visitPerson?.company ?? "",
      direction,
      vehicle,
      item.visitPerson
        ? labels.status[
            item.visitPerson.status as keyof typeof labels.status
          ] ?? ""
        : "",
      item.registeredBy.fullName,
      item.notes ?? "",
      formatDate(item.createdAt),
    ];
  } else {
    const mode =
      labels.accessMode[item.accessMode as keyof typeof labels.accessMode] ??
      item.accessMode;
    fields = [
      item.resident?.fullName ?? "",
      item.resident?.unit ?? "",
      direction,
      mode,
      vehicle,
      item.registeredBy.fullName,
      item.notes ?? "",
      formatDate(item.createdAt),
    ];
  }

  if (showTenant) fields.unshift(item.tenantName ?? "");
  return rowToCsv(fields);
}

export const CSV_BOM = "﻿";
