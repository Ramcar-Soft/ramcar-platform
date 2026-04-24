import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { updaterStore } from "../lib/updater-store";

export function useUpdateNotifier() {
  const { t } = useTranslation();
  const shownVersion = useRef<string | null>(null);

  useEffect(() => {
    const showIfPending = () => {
      const version = updaterStore.getSnapshot();
      if (!version || shownVersion.current === version) return;
      shownVersion.current = version;

      toast(t("updater.updateReady"), {
        description: t("updater.updateReadyVersion", { version }),
        duration: Infinity,
        action: {
          label: t("updater.restartNow"),
          onClick: () => updaterStore.installNow(),
        },
        cancel: {
          label: t("updater.later"),
          onClick: () => {},
        },
      });
    };

    showIfPending();
    return updaterStore.subscribe(showIfPending);
  }, [t]);
}
