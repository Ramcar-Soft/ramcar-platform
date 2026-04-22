"use client";

import { useLocale, useTranslations } from "next-intl";
import { LogbookSubpage } from "@/features/logbook";
import { getProvidersColumns } from "@/features/logbook/components/providers-columns";

export default function LogbookProvidersPage() {
  const t = useTranslations("logbook");
  const locale = useLocale();
  const columns = getProvidersColumns((key) => t(key), locale);

  return <LogbookSubpage personType="service_provider" columns={columns} />;
}
