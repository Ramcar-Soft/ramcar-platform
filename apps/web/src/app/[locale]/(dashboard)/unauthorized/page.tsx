"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@ramcar/ui";
import { ShieldAlert } from "lucide-react";
import { logout } from "@/features/auth/actions/logout";

export default function UnauthorizedPage() {
  const t = useTranslations("unauthorized");

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("message")}</p>
          <Button variant="outline" onClick={() => logout()}>
            {t("logout")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
