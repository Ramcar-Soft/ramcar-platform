"use client";

import { useRef, useState } from "react";
import { useKeyboardNavigation } from "@ramcar/features";
import { ExportAllDialog } from "./export-all-dialog";
import { LogbookTable } from "./logbook-table";
import { LogbookToolbar } from "./logbook-toolbar";
import { useLogbook } from "../hooks/use-logbook";
import { useLogbookFilters } from "../hooks/use-logbook-filters";
import type { LogbookColumn } from "../types";

interface LogbookSubpageProps {
  personType: "visitor" | "service_provider" | "resident";
  columns: LogbookColumn[];
}

export function LogbookSubpage({ personType, columns }: LogbookSubpageProps) {
  const { filters, setFilters, setSearch } = useLogbookFilters();
  const { data, isLoading, error, refetch } = useLogbook(personType, filters);
  const [exportAllOpen, setExportAllOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useKeyboardNavigation({ searchInputRef });

  return (
    <div className="flex flex-col gap-4">
      <LogbookToolbar
        ref={searchInputRef}
        filters={filters}
        onFilterChange={setFilters}
        onSearchChange={setSearch}
        onResidentChange={(id) => setFilters({ residentId: id })}
        personType={personType}
        totalRows={data?.meta?.total}
        onExportAll={() => setExportAllOpen(true)}
      />
      <LogbookTable
        columns={columns}
        data={data?.data ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        error={(error as Error) ?? null}
        onPageChange={(page) => setFilters({ page })}
        onPageSizeChange={(pageSize) => setFilters({ pageSize })}
        refetch={refetch}
      />
      <ExportAllDialog
        open={exportAllOpen}
        onClose={() => setExportAllOpen(false)}
        personType={personType}
      />
    </div>
  );
}
