"use client";

import { useTranslations } from "next-intl";

interface EmptyStateProps {
  variant?: "empty" | "error";
  onRetry?: () => void;
}

export function EmptyState({ variant = "empty", onRetry }: EmptyStateProps) {
  const t = useTranslations("logbook");

  if (variant === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-muted-foreground">{t("error.title")}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-sm underline hover:text-foreground"
          >
            {t("error.retry")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <p className="font-medium">{t("empty.title")}</p>
      <p className="text-sm text-muted-foreground">{t("empty.description")}</p>
    </div>
  );
}
