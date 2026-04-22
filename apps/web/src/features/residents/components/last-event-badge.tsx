"use client";

import { Badge } from "@ramcar/ui";
import { useTranslations } from "next-intl";
import type { AccessEvent } from "../types";

interface RecentEventsListProps {
  events: AccessEvent[] | undefined;
  isLoading: boolean;
}

export function RecentEventsList({ events, isLoading }: RecentEventsListProps) {
  const t = useTranslations("accessEvents");
  const lastEvent = events?.[0];

  function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return t("lastEvent.justNow");
    if (diffMin < 60) return t("lastEvent.minutesAgo", { count: diffMin });
    if (diffHours < 24) return t("lastEvent.hoursAgo", { count: diffHours });
    return t("lastEvent.daysAgo", { count: diffDays });
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{t("lastEvent.label")}:</span>
        <span className="animate-pulse">...</span>
      </div>
    );
  }

  if (!lastEvent || events.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{t("lastEvent.label")}:</span>
        <span>{t("lastEvent.noEvents")}</span>
      </div>
    );
  }

  const variant = lastEvent.direction === "entry" ? "default" : "secondary";
  return (
    <div className="space-y-2">
      <div key={lastEvent.id} className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t("lastEvent.label")}:</span>
        <Badge variant={variant}>
          {t(`direction.${lastEvent.direction}`)}
        </Badge>
        <span className="text-muted-foreground">
          {formatRelativeTime(lastEvent.createdAt)}
        </span>
      </div>
    </div>
  );
}
