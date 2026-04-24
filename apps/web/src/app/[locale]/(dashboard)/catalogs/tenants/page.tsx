import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { TenantsTable } from "@/features/tenants/components/tenants-table";
import type { Role } from "@ramcar/shared";

const ALLOWED_ROLES: Role[] = ["super_admin", "admin"];

interface TenantsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function TenantsPage({ params }: TenantsPageProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const role = data.user?.app_metadata?.role as Role | undefined;

  if (!role || !ALLOWED_ROLES.includes(role)) {
    redirect(`/${locale}/dashboard`);
  }

  return <TenantsTable />;
}
