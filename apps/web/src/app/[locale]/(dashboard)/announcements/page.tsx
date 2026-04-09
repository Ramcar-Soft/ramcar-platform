import { getTranslations } from "next-intl/server";

export default async function AnnouncementsPage() {
  const t = await getTranslations("sidebar");

  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-3xl font-semibold text-foreground">{t("announcements")}</h1>
    </main>
  );
}
