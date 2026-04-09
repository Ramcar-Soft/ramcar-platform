import { getTranslations } from "next-intl/server";

export default async function DashboardPage() {
  const t = await getTranslations("sidebar");

  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-3xl font-semibold text-foreground">{t("dashboard")}</h1>
    </main>
  );
}
