import { getTranslations } from "next-intl/server";

export default async function AmenitiesPage() {
  const t = await getTranslations("sidebar");

  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-3xl font-semibold text-foreground">{t("amenities")}</h1>
    </main>
  );
}
