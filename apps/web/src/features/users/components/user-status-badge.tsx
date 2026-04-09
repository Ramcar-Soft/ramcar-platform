"use client";

import { Badge } from "@ramcar/ui";
import { useTranslations } from "next-intl";
import type { UserStatus } from "../types";

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const t = useTranslations("users.status");

  return (
    <Badge variant={status === "active" ? "default" : "secondary"}>
      {t(status)}
    </Badge>
  );
}
