"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Skeleton,
  cn,
} from "@ramcar/ui";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { useKeyboardNavigation } from "@ramcar/features";
import { useTenants } from "../hooks/use-tenants";
import { useTenantsTableColumns } from "./tenants-table-columns";
import { TenantSidebar } from "./tenant-sidebar";
import { TenantFilters } from "./tenant-filters";
import type { Tenant } from "../types";

export function TenantsTable() {
  const t = useTranslations("tenants");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "inactive" | "all">("active");
  const [page] = useState(1);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<"create" | "edit">("create");
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>(undefined);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const highlightedRowRef = useRef<HTMLTableRowElement | null>(null);

  const { data, isLoading } = useTenants({ search, status, page });
  const tenants = data?.data ?? [];

  const handleEdit = useCallback((tenant: Tenant) => {
    setSelectedTenantId(tenant.id);
    setSidebarMode("edit");
    setSidebarOpen(true);
  }, []);

  const columns = useTenantsTableColumns(handleEdit);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [search, status, page, data?.data]);

  useEffect(() => {
    highlightedRowRef.current?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  useKeyboardNavigation<Tenant>({
    searchInputRef,
    items: tenants,
    disabled: sidebarOpen,
    highlightedIndex,
    setHighlightedIndex,
    onSelectItem: handleEdit,
  });

  function handleFilterChange(partial: { search?: string; status?: "active" | "inactive" | "all" }) {
    if (partial.search !== undefined) setSearch(partial.search);
    if (partial.status !== undefined) setStatus(partial.status);
  }

  function handleCreate() {
    setSelectedTenantId(undefined);
    setSidebarMode("create");
    setSidebarOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">{t("nav.label")}</h1>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t("actions.create")}
        </Button>
      </div>
      <div className="flex items-center justify-between">
        <TenantFilters
          ref={searchInputRef}
          search={search}
          status={status}
          onChange={handleFilterChange}
        />

      </div>

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
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((col) => (
                      <TableCell key={col.key}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : tenants.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                        {t("table.emptyState")}
                      </TableCell>
                    </TableRow>
                  )
                : tenants.map((tenant, index) => (
                    <TableRow
                      key={tenant.id}
                      ref={index === highlightedIndex ? highlightedRowRef : null}
                      className={cn(
                        "cursor-pointer transition-colors",
                        index === highlightedIndex && "bg-accent",
                      )}
                      aria-selected={index === highlightedIndex}
                      onClick={() => handleEdit(tenant)}
                    >
                      {columns.map((col) => (
                        <TableCell
                          key={col.key}
                          onClick={
                            col.key === "actions"
                              ? (e) => e.stopPropagation()
                              : undefined
                          }
                        >
                          {col.cell(tenant)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
          </TableBody>
        </Table>
      </div>

      <TenantSidebar
        open={sidebarOpen}
        mode={sidebarMode}
        tenantId={selectedTenantId}
        onClose={() => setSidebarOpen(false)}
      />
    </div>
  );
}
