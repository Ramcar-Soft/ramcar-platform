"use client";

import { forwardRef, useEffect, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Skeleton,
  Input,
  cn,
} from "@ramcar/ui";
import { useTranslations } from "next-intl";
import type { ExtendedUserProfile, PaginatedResponse } from "../types";
import { getResidentColumns } from "./residents-table-columns";
import { ShortcutsHint } from "@ramcar/features";

interface ResidentsTableProps {
  data: PaginatedResponse<ExtendedUserProfile> | undefined;
  isLoading: boolean;
  isError: boolean;
  highlightedIndex: number;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectResident: (resident: ExtendedUserProfile) => void;
}

export const ResidentsTable = forwardRef<HTMLInputElement, ResidentsTableProps>(
  function ResidentsTable(
    { data, isLoading, isError, highlightedIndex, search, onSearchChange, onSelectResident },
    searchInputRef,
  ) {
    const t = useTranslations("residents");
    const columns = getResidentColumns(t);
    const highlightedRowRef = useRef<HTMLTableRowElement>(null);

    useEffect(() => {
      highlightedRowRef.current?.scrollIntoView({ block: "nearest" });
    }, [highlightedIndex]);

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <ShortcutsHint search navigate select />
        </div>

        <Input
          ref={searchInputRef}
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-sm"
        />

        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-secondary">
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key}>{col.header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((col) => (
                      <TableCell key={col.key}>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center text-destructive py-8"
                  >
                    {t("errorLoading")}
                  </TableCell>
                </TableRow>
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center text-muted-foreground py-8"
                  >
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((resident, index) => (
                  <TableRow
                    key={resident.id}
                    ref={index === highlightedIndex ? highlightedRowRef : null}
                    className={cn(
                      "cursor-pointer transition-colors",
                      index === highlightedIndex && "bg-accent",
                      resident.status === "inactive" && "opacity-60",
                    )}
                    aria-selected={index === highlightedIndex}
                    onClick={() => onSelectResident(resident)}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.key}>{col.render(resident)}</TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  },
);
