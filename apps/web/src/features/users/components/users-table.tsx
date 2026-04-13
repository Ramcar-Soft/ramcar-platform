"use client";

import { useState, useCallback } from "react";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Skeleton,
} from "@ramcar/ui";
import { useTranslations } from "next-intl";
import { useAppStore } from "@ramcar/store";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import type { UserFilters } from "../types";
import { useUsers } from "../hooks/use-users";
import { useTenants } from "../hooks/use-tenants";
import { UserFiltersBar } from "./user-filters";
import { getUserColumns, SortableHeader } from "./users-table-columns";
import { ConfirmStatusDialog } from "./confirm-status-dialog";
import type { ExtendedUserProfile } from "../types";

interface UsersTableProps {
  locale: string;
}

export function UsersTable({ locale }: UsersTableProps) {
  const t = useTranslations("users");
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const isSuperAdmin = user?.role === "super_admin";
  const { data: tenants } = useTenants();

  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    pageSize: 10,
    sortBy: "full_name",
    sortOrder: "asc",
  });

  const [statusDialogUser, setStatusDialogUser] =
    useState<ExtendedUserProfile | null>(null);

  const { data, isLoading, isError } = useUsers(filters);

  const handleFiltersChange = useCallback((partial: Partial<UserFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleSort = useCallback(
    (key: string) => {
      setFilters((prev) => ({
        ...prev,
        sortBy: key,
        sortOrder:
          prev.sortBy === key && prev.sortOrder === "asc" ? "desc" : "asc",
        page: 1,
      }));
    },
    [],
  );

  const handleEdit = useCallback(
    (u: ExtendedUserProfile) => {
      router.push(`/${locale}/catalogs/users/${u.id}/edit`);
    },
    [router, locale],
  );

  const handleToggleStatus = useCallback((u: ExtendedUserProfile) => {
    setStatusDialogUser(u);
  }, []);

  const columns = getUserColumns({
    t,
    onEdit: handleEdit,
    onToggleStatus: handleToggleStatus,
  });

  const meta = data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {(user?.role === "super_admin" || user?.role === "admin") && (
          <Button onClick={() => router.push(`/${locale}/catalogs/users/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("createUser")}
          </Button>
        )}
      </div>

      <UserFiltersBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        tenants={isSuperAdmin ? tenants : undefined}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-secondary">
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key}>
                  {col.sortable ? (
                    <SortableHeader onSort={() => handleSort(col.key)}>
                      {col.header}
                    </SortableHeader>
                  ) : (
                    col.header
                  )}
                </TableHead>
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
              data?.data.map((u) => (
                <TableRow key={u.id}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>{col.render(u)}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("pagination.showing", {
              from: (meta.page - 1) * meta.pageSize + 1,
              to: Math.min(meta.page * meta.pageSize, meta.total),
              total: meta.total,
            })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => handleFiltersChange({ page: meta.page - 1 })}
            >
              {t("pagination.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => handleFiltersChange({ page: meta.page + 1 })}
            >
              {t("pagination.next")}
            </Button>
          </div>
        </div>
      )}

      <ConfirmStatusDialog
        user={statusDialogUser}
        onClose={() => setStatusDialogUser(null)}
      />
    </div>
  );
}
