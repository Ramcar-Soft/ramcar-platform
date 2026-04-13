import { useEffect } from "react";
import { useAppStore } from "@ramcar/store";
import { cn } from "@ramcar/ui";
import { useTranslation } from "react-i18next";
import { Cloud, CloudOff, Loader2, AlertCircle } from "lucide-react";

export function SyncIndicator() {
  const { t } = useTranslation();
  const syncStatus = useAppStore((s) => s.syncStatus);
  const pendingCount = useAppStore((s) => s.pendingCount);
  const updateSync = useAppStore((s) => s.updateSync);

  useEffect(() => {
    if (!window.api?.sync?.onStatusChange) return;
    const unsubscribe = window.api.sync.onStatusChange((data) => {
      updateSync(data.status as "idle" | "syncing" | "error" | "offline", data.pendingCount);
    });
    return unsubscribe;
  }, [updateSync]);

  const config = {
    idle: { icon: Cloud, className: "text-green-500", label: t("sync.idle") },
    syncing: { icon: Loader2, className: "text-blue-500 animate-spin", label: t("sync.syncing") },
    error: { icon: AlertCircle, className: "text-destructive", label: t("sync.error") },
    offline: { icon: CloudOff, className: "text-muted-foreground", label: t("sync.offline") },
  };

  const { icon: Icon, className, label } = config[syncStatus];

  return (
    <div className="flex items-center gap-1.5 text-xs" title={label}>
      <Icon className={cn("h-4 w-4", className)} />
      {pendingCount > 0 && (
        <span className="text-muted-foreground">
          {t("sync.pending", { count: pendingCount })}
        </span>
      )}
    </div>
  );
}
