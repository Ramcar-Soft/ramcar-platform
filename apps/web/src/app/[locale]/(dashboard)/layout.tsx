import React from "react";
import { getLocale } from "next-intl/server";
import { createClient } from "@/shared/lib/supabase/server";
import { redirect } from "@/i18n/routing";
import type { Locale } from "@ramcar/i18n";
import { DashboardShell } from "./dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const locale = (await getLocale()) as Locale;
    return redirect({ href: "/login", locale });
  }

  return <DashboardShell>{children}</DashboardShell>;
}
