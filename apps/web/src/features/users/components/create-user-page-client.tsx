"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserForm, type UserFormData } from "./user-form";
import { useCreateUser } from "../hooks/use-create-user";
import { useTenants } from "../hooks/use-tenants";
import { useUserGroups } from "../hooks/use-user-groups";
import type { CreateUserInput } from "@ramcar/shared";

interface CreateUserPageClientProps {
  locale: string;
}

export function CreateUserPageClient({ locale }: CreateUserPageClientProps) {
  const t = useTranslations("users");
  const router = useRouter();
  const createMutation = useCreateUser();
  const { data: tenants = [], isLoading: tenantsLoading } = useTenants();
  const { data: userGroups = [], isLoading: groupsLoading } = useUserGroups();

  const isLoading = tenantsLoading || groupsLoading;

  const handleSubmit = async (data: UserFormData) => {
    try {
      await createMutation.mutateAsync(data as CreateUserInput);
      router.push(`/${locale}/catalogs/users`);
    } catch {
      // Error is available via createMutation.error
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("createUser")}</h1>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("createUser")}</h1>
      {createMutation.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {createMutation.error.message || t("messages.errorCreating")}
        </div>
      )}
      <UserForm
        mode="create"
        tenants={tenants}
        userGroups={userGroups}
        isPending={createMutation.isPending}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/${locale}/catalogs/users`)}
      />
    </div>
  );
}
