import { getLocale } from "next-intl/server";
import { createClient } from "@/shared/lib/supabase/server";
import { CreateUserPageClient } from "@/features/users/components/create-user-page-client";

export default async function NewUserPage() {
  const locale = await getLocale();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user?.app_metadata?.role ?? "resident";

  if (role !== "super_admin" && role !== "admin") {
    const { redirect } = await import("@/i18n/routing");
    return redirect({ href: "/catalogs/users", locale });
  }

  return <CreateUserPageClient locale={locale} />;
}
