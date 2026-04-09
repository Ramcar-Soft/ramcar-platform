import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import type { Locale } from "@ramcar/i18n";

export default async function CatalogsPage() {
  const locale = (await getLocale()) as Locale;
  return redirect({ href: "/catalogs/users", locale });
}
