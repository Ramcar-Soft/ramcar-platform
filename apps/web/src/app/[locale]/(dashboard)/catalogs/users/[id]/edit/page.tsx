import { getLocale } from "next-intl/server";
import { EditUserPageClient } from "@/features/users/components/edit-user-page-client";

interface EditUserPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { id } = await params;
  const locale = await getLocale();

  return <EditUserPageClient id={id} locale={locale} />;
}
