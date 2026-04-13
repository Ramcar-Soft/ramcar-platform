import { Badge } from "@ramcar/ui";
import { useTranslation } from "react-i18next";
import type { AccessEvent } from "../types";

interface RecentEventsListProps {
  events: AccessEvent[] | undefined;
  isLoading: boolean;
  onEdit?: (event: AccessEvent) => void;
}

export function RecentEventsList({ events, isLoading, onEdit }: RecentEventsListProps) {
  const { t } = useTranslation();

  function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return t("accessEvents.lastEvent.justNow");
    if (diffMin < 60) return t("accessEvents.lastEvent.minutesAgo", { count: diffMin });
    if (diffHours < 24) return t("accessEvents.lastEvent.hoursAgo", { count: diffHours });
    return t("accessEvents.lastEvent.daysAgo", { count: diffDays });
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{t("accessEvents.lastEvent.label")}:</span>
        <span className="animate-pulse">...</span>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{t("accessEvents.lastEvent.label")}:</span>
        <span>{t("accessEvents.lastEvent.noEvents")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event, index) => {
        const variant = event.direction === "entry" ? "default" : "secondary";
        return (
          <div key={event.id} className="flex items-center gap-2 text-sm">
            {index === 0 && (
              <span className="text-muted-foreground">{t("accessEvents.lastEvent.label")}:</span>
            )}
            <Badge variant={variant}>
              {t(`accessEvents.direction.${event.direction}`)}
            </Badge>
            <span className="text-muted-foreground">
              {formatRelativeTime(event.createdAt)}
            </span>
            {onEdit && (
              <button
                type="button"
                className="text-xs text-primary hover:underline ml-auto"
                onClick={() => onEdit(event)}
              >
                {t("accessEvents.form.edit")}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
