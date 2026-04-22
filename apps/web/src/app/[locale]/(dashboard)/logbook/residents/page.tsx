"use client";

import { useLocale, useTranslations } from "next-intl";
import { LogbookSubpage } from "@/features/logbook";
import { getResidentsColumns } from "@/features/logbook/components/residents-columns";

export default function LogbookResidentsPage() {
  const t = useTranslations("logbook");
  const locale = useLocale();
  const columns = getResidentsColumns((key) => t(key), locale);

  return <LogbookSubpage personType="resident" columns={columns} />;
}
