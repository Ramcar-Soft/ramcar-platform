import React from "react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@ramcar/ui";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/shared/lib/supabase/server";
import { redirect } from "@/i18n/routing";
import { logout } from "@/features/auth/actions/logout";
import type { Locale } from "@ramcar/i18n";

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const locale = (await getLocale()) as Locale;
    return redirect({ href: "/login", locale });
  }

  const t = await getTranslations("dashboard");
  const tAuth = await getTranslations("auth.logout");

  const fullName =
    user.user_metadata.full_name ??
    user.user_metadata.name ??
    "User";
  const email = user.email ?? "No email";
  const role =
    (user.app_metadata.role as string) ?? "No role assigned";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">
            {t("welcome", { name: fullName })}
          </CardTitle>
          <CardDescription>{t("signedInMessage")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("emailLabel")}</span>
            <span>{email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("roleLabel")}</span>
            <span className="capitalize">{role}</span>
          </div>
          <form action={logout} className="mt-4">
            <Button type="submit" variant="outline" className="w-full">
              {tAuth("button")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
