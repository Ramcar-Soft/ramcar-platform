import React from "react";
import { getLocale } from "next-intl/server";
import { createClient } from "@/shared/lib/supabase/server";
import { redirect } from "@/i18n/routing";
import { LanguageSwitcher } from "@/shared/components/language-switcher";
import type { Locale } from "@ramcar/i18n";

export default async function ProtectedLayout({
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

  return (
    <div className="relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      {children}
    </div>
  );
}
