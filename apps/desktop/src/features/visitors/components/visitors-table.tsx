import { forwardRef, useEffect, useRef } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Skeleton, Input, Button, cn,
} from "@ramcar/ui";
import { useTranslation } from "react-i18next";
import type { VisitPerson, PaginatedResponse } from "../types";
import { getVisitorColumns } from "./visitors-table-columns";

interface VisitorsTableProps {
  data: PaginatedResponse<VisitPerson> | undefined;
  isLoading: boolean;
  isError: boolean;
  highlightedIndex: number;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectPerson: (person: VisitPerson) => void;
  onEditPerson?: (person: VisitPerson) => void;
  onRegisterNew?: () => void;
}

export const VisitorsTable = forwardRef<HTMLInputElement, VisitorsTableProps>(
  function VisitorsTable(
    { data, isLoading, isError, highlightedIndex, search, onSearchChange, onSelectPerson, onEditPerson, onRegisterNew },
    searchInputRef,
  ) {
    const { t } = useTranslation();
    const columns = getVisitorColumns(t as (key: string) => string, {
      onEditPerson,
      editLabel: t("visitPersons.actions.editVisitor"),
    });
    const highlightedRowRef = useRef<HTMLTableRowElement>(null);

    useEffect(() => {
      highlightedRowRef.current?.scrollIntoView({ block: "nearest" });
    }, [highlightedIndex]);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("visitPersons.title")}</h1>
          {onRegisterNew && (
            <Button size="sm" onClick={onRegisterNew}>
              + {t("visitPersons.registerNew")}
            </Button>
          )}
        </div>

        <Input
          ref={searchInputRef}
          placeholder={t("visitPersons.searchPlaceholder")}
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
                      <TableCell key={col.key}><Skeleton className="h-4 w-24" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center text-destructive py-8">
                    {t("visitPersons.errorLoading")}
                  </TableCell>
                </TableRow>
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                    {search ? t("visitPersons.emptySearch") : t("visitPersons.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((person, index) => (
                  <TableRow
                    key={person.id}
                    ref={index === highlightedIndex ? highlightedRowRef : null}
                    className={cn(
                      "cursor-pointer transition-colors",
                      index === highlightedIndex && "bg-accent",
                      person.status === "denied" && "opacity-60",
                    )}
                    aria-selected={index === highlightedIndex}
                    onClick={() => onSelectPerson(person)}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.key}>{col.render(person)}</TableCell>
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
