"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserForm, type UserFormData } from "./user-form";
import { useGetUser } from "../hooks/use-get-user";
import { useUpdateUser } from "../hooks/use-update-user";
import { useTenants } from "../hooks/use-tenants";
import { useUserGroups } from "../hooks/use-user-groups";
import type { UpdateUserInput } from "@ramcar/shared";

interface EditUserPageClientProps {
  id: string;
  locale: string;
}

export function EditUserPageClient({
  id,
  locale,
}: EditUserPageClientProps) {
  const t = useTranslations("users");
  const router = useRouter();
  const { data: user, isLoading: userLoading, isError } = useGetUser(id);
  const { data: tenants = [], isLoading: tenantsLoading } = useTenants();
  const { data: userGroups = [], isLoading: groupsLoading } = useUserGroups();
  const updateMutation = useUpdateUser(id);

  const isLoading = userLoading || tenantsLoading || groupsLoading;

  const handleSubmit = async (data: UserFormData) => {
    try {
      await updateMutation.mutateAsync(data as UpdateUserInput);
      router.push(`/${locale}/catalogs/users`);
    } catch {
      // Error is available via updateMutation.error
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("editUser")}</h1>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("editUser")}</h1>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {t("errorLoading")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("editUser")}</h1>
      {updateMutation.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {updateMutation.error.message || t("messages.errorUpdating")}
        </div>
      )}
      <UserForm
        mode="edit"
        initialData={user}
        tenants={tenants}
        userGroups={userGroups}
        isPending={updateMutation.isPending}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/${locale}/catalogs/users`)}
      />
    </div>
  );
}
