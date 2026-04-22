"use client";

import { Badge } from "@ramcar/ui";
import { useTranslations } from "next-intl";
import type { VisitPersonStatus } from "@ramcar/shared";

interface StatusBadgeProps {
  status: VisitPersonStatus;
}

const variantMap: Record<
  VisitPersonStatus,
  "default" | "secondary" | "destructive"
> = {
  allowed: "default",
  flagged: "secondary",
  denied: "destructive",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations("logbook");
  return <Badge variant={variantMap[status]}>{t(`status.${status}`)}</Badge>;
}
