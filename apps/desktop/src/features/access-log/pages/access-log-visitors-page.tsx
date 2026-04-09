import { useTranslation } from "react-i18next";

export function AccessLogVisitorsPage() {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-3xl font-semibold text-foreground">{t("sidebar.access-log_visitors")}</h1>
    </main>
  );
}
