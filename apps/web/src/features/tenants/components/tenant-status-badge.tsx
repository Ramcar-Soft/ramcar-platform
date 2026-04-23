"use client";

import { Badge } from "@ramcar/ui";
import { useTranslations } from "next-intl";
import type { TenantStatus } from "../types";

interface TenantStatusBadgeProps {
  status: TenantStatus;
}

export function TenantStatusBadge({ status }: TenantStatusBadgeProps) {
  const t = useTranslations("tenants");
  return (
    <Badge variant={status === "active" ? "default" : "secondary"}>
      {t(`status.${status}`)}
    </Badge>
  );
}
