"use client";

import { useLocale, useTranslations } from "next-intl";
import { LogbookSubpage, getVisitorsColumns } from "@/features/logbook";

export default function LogbookVisitorsPage() {
  const t = useTranslations("logbook");
  const locale = useLocale();
  const columns = getVisitorsColumns((key) => t(key), locale);

  return <LogbookSubpage personType="visitor" columns={columns} />;
}
