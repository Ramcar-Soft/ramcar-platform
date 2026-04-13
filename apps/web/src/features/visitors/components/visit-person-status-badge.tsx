"use client";

import { Badge } from "@ramcar/ui";
import { useTranslations } from "next-intl";
import type { VisitPersonStatus } from "../types";

const statusVariantMap: Record<VisitPersonStatus, "default" | "destructive" | "warning"> = {
  allowed: "default",
  flagged: "warning",
  denied: "destructive",
};

interface VisitPersonStatusBadgeProps {
  status: VisitPersonStatus;
}

export function VisitPersonStatusBadge({ status }: VisitPersonStatusBadgeProps) {
  const t = useTranslations("visitPersons");

  return (
    <Badge variant={statusVariantMap[status]}>
      {t(`status.${status}`)}
    </Badge>
  );
}
