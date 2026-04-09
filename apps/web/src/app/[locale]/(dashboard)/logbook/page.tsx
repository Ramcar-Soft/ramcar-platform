import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import type { Locale } from "@ramcar/i18n";

export default async function LogbookPage() {
  const locale = (await getLocale()) as Locale;
  return redirect({ href: "/logbook/visitors", locale });
}
