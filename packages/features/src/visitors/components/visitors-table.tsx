import { forwardRef, useEffect, useRef, type ReactNode } from "react";
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
import { useI18n } from "../../adapters/i18n";
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
  emptyState?: ReactNode;
  trailingAction?: ReactNode;
}

export const VisitorsTable = forwardRef<HTMLInputElement, VisitorsTableProps>(
  function VisitorsTable(
    {
      data,
      isLoading,
      isError,
      highlightedIndex,
      search,
      onSearchChange,
      onSelectPerson,
      onEditPerson,
      onRegisterNew,
      emptyState,
      trailingAction,
    },
    searchInputRef,
  ) {
    const { t } = useI18n();
    const editLabel = t("visitPersons.actions.editVisitor");
    const columns = getVisitorColumns(t, { onEditPerson, editLabel });
    const highlightedRowRef = useRef<HTMLTableRowElement>(null);

    useEffect(() => {
      highlightedRowRef.current?.scrollIntoView({ block: "nearest" });
    }, [highlightedIndex]);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("visitPersons.title")}</h1>
          {trailingAction ?? (
            onRegisterNew && (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                onClick={onRegisterNew}
              >
                + {t("visitPersons.registerNew")}
              </button>
            )
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
                    {t("visitPersons.errorLoading")}
                  </TableCell>
                </TableRow>
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center text-muted-foreground py-8"
                  >
                    {emptyState ?? (
                      <>
                        {search ? t("visitPersons.emptySearch") : t("visitPersons.empty")}
                        {search && onRegisterNew && (
                          <button
                            type="button"
                            className="block mx-auto mt-2 text-sm text-primary hover:underline"
                            onClick={onRegisterNew}
                          >
                            + {t("visitPersons.registerNew")}
                          </button>
                        )}
                      </>
                    )}
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
