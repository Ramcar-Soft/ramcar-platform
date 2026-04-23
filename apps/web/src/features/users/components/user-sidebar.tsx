"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ramcar/ui";
import { UserForm, type UserFormData } from "./user-form";
import { useGetUser } from "../hooks/use-get-user";
import { useCreateUser } from "../hooks/use-create-user";
import { useUpdateUser } from "../hooks/use-update-user";
import { useTenants } from "@/features/tenants/hooks/use-tenants";
import { useUserGroups } from "../hooks/use-user-groups";
import type { CreateUserInput, UpdateUserInput } from "@ramcar/shared";

export type UserSidebarMode = "create" | "edit";

export interface UserSidebarProps {
  open: boolean;
  mode: UserSidebarMode;
  userId?: string;
  onClose: () => void;
}

export function UserSidebar({ open, mode, userId, onClose }: UserSidebarProps) {
  const t = useTranslations("users");

  const { data: tenantsData, isLoading: tenantsLoading } = useTenants({
    page_size: 100,
    status: "active",
  });
  const tenants = (tenantsData?.data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
  }));
  const { data: userGroups = [], isLoading: groupsLoading } = useUserGroups();

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser(userId ?? "");

  const {
    data: userData,
    isLoading: userLoading,
    isFetching: userFetching,
    isError: userError,
  } = useGetUser(userId ?? "", {
    enabled: Boolean(open && mode === "edit" && userId),
  });

  const title = t(mode === "create" ? "sidebar.createTitle" : "sidebar.editTitle");

  function renderBody() {
    if (mode === "edit") {
      if (userLoading || userFetching || tenantsLoading || groupsLoading) {
        return (
          <div className="flex items-center justify-center py-12" data-testid="user-sidebar-spinner">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        );
      }
      if (userError || !userData) {
        return (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {t("errorLoading")}
          </div>
        );
      }
      return (
        <UserForm
          mode="edit"
          initialData={userData}
          tenants={tenants}
          userGroups={userGroups}
          isPending={updateMutation.isPending}
          onSubmit={async (values: UserFormData) => {
            updateMutation.mutate(values as UpdateUserInput, { onSuccess: onClose });
          }}
          onCancel={onClose}
        />
      );
    }

    // create mode
    return (
      <UserForm
        mode="create"
        tenants={tenants}
        userGroups={userGroups}
        isPending={createMutation.isPending}
        onSubmit={async (values: UserFormData) => {
          createMutation.mutate(values as CreateUserInput, { onSuccess: onClose });
        }}
        onCancel={onClose}
      />
    );
  }

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent
        side="right"
        className="w-[400px] sm:w-[800px] sm:max-w-[800px] overflow-y-auto px-4 pb-6"
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className="sr-only">User form panel</SheetDescription>
        </SheetHeader>
        {renderBody()}
      </SheetContent>
    </Sheet>
  );
}
