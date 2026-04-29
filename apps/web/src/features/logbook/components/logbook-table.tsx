"use client";

import {
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ramcar/ui";
import { useTranslations } from "next-intl";
import type { AccessEventListItem, PaginationMeta } from "@ramcar/shared";
import type { LogbookColumn } from "../types";
import { EmptyState } from "./empty-state";

const PAGE_SIZE_OPTIONS: Array<10 | 25 | 50 | 100> = [10, 25, 50, 100];

interface LogbookTableProps {
  columns: LogbookColumn[];
  data: AccessEventListItem[];
  meta?: PaginationMeta;
  isLoading: boolean;
  error?: Error | null;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: 10 | 25 | 50 | 100) => void;
  refetch?: () => void;
}

export function LogbookTable({
  columns,
  data,
  meta,
  isLoading,
  error,
  onPageChange,
  onPageSizeChange,
  refetch,
}: LogbookTableProps) {
  const t = useTranslations("logbook");

  const allColumns: LogbookColumn[] = [
    {
      id: "tenant",
      header: t("columns.tenant"),
      cell: (item) => item.tenantName ?? "—",
    },
    ...columns,
  ];

  if (error) {
    return <EmptyState variant="error" onRetry={refetch} />;
  }

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {allColumns.map((col) => (
                <TableHead key={col.id}>{col.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {allColumns.map((col) => (
                  <TableCell key={col.id}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <EmptyState />;
  }

  const totalPages = meta?.totalPages ?? 1;
  const currentPage = meta?.page ?? 1;
  const currentPageSize = meta?.pageSize ?? 25;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {allColumns.map((col) => (
                <TableHead key={col.id}>{col.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                {allColumns.map((col) => (
                  <TableCell key={col.id}>{col.cell(item)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="logbook-page-size" className="text-muted-foreground">
            {t("pagination.pageSize")}
          </label>
          <select
            id="logbook-page-size"
            className="rounded-md border bg-background px-2 py-1 text-sm"
            value={currentPageSize}
            onChange={(e) =>
              onPageSizeChange(Number(e.target.value) as 10 | 25 | 50 | 100)
            }
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            {t("pagination.previous")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("pagination.indicator", {
              page: String(currentPage),
              totalPages: String(totalPages),
            })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            {t("pagination.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
