import { getTranslations } from "next-intl/server";

export default async function ComplaintsPage() {
  const t = await getTranslations("sidebar");

  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-3xl font-semibold text-foreground">{t("complaints")}</h1>
    </main>
  );
}
