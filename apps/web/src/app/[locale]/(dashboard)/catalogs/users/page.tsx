import { getLocale } from "next-intl/server";
import { UsersTable } from "@/features/users/components/users-table";

export default async function UsersPage() {
  const locale = await getLocale();

  return <UsersTable locale={locale} />;
}
