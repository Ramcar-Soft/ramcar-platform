"use client";

import { Button, Badge, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@ramcar/ui";
import { UserStatusBadge } from "./user-status-badge";
import { MoreHorizontal, ArrowUpDown } from "lucide-react";
import type { ExtendedUserProfile } from "../types";

interface ColumnDef {
  key: string;
  header: string;
  sortable?: boolean;
  render: (user: ExtendedUserProfile) => React.ReactNode;
}

interface GetColumnsOptions {
  t: (key: string) => string;
  onEdit: (user: ExtendedUserProfile) => void;
  onToggleStatus: (user: ExtendedUserProfile) => void;
}

export function getUserColumns({ t, onEdit, onToggleStatus }: GetColumnsOptions): ColumnDef[] {
  return [
    {
      key: "full_name",
      header: t("columns.fullName"),
      sortable: true,
      render: (user) => <span className="font-medium">{user.fullName}</span>,
    },
    {
      key: "email",
      header: t("columns.email"),
      sortable: true,
      render: (user) => user.email ?? "",
    },
    {
      key: "role",
      header: t("columns.role"),
      sortable: true,
      render: (user) => (
        <Badge variant="outline">{t(`roles.${user.role}`)}</Badge>
      ),
    },
    {
      key: "tenant",
      header: t("columns.tenant"),
      render: (user) => user.tenantName,
    },
    {
      key: "phone",
      header: t("columns.phone"),
      render: (r) => r.phone ? <a className="text-blue-700 underline" href={`tel:${r.phone}`}>{r.phone}</a> : "—",
    },
    {
      key: "status",
      header: t("columns.status"),
      sortable: true,
      render: (user) => <UserStatusBadge status={user.status} />,
    },
    {
      key: "user_groups",
      header: t("columns.userGroups"),
      render: (user) =>
        user.userGroups.length > 0
          ? user.userGroups.map((g) => g.name).join(", ")
          : "—",
    },
    {
      key: "actions",
      header: t("columns.actions"),
      render: (user) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {user.canEdit && (
              <DropdownMenuItem onClick={() => onEdit(user)}>
                {t("actions.edit")}
              </DropdownMenuItem>
            )}
            {user.canDeactivate && (
              <DropdownMenuItem onClick={() => onToggleStatus(user)}>
                {user.status === "active"
                  ? t("actions.deactivate")
                  : t("actions.reactivate")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}

export function SortableHeader({
  children,
  onSort,
}: {
  children: React.ReactNode;
  onSort: () => void;
}) {
  return (
    <Button variant="ghost" onClick={onSort} className="-ml-4">
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );
}
