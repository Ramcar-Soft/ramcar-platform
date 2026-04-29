import { CheckCircle2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Button,
} from "@ramcar/ui";
import { useI18n } from "../../adapters";
import type { AccessEventFeedbackController } from "../types";

interface Props {
  controller: AccessEventFeedbackController;
}

export function AccessEventFeedbackOverlay({ controller }: Props) {
  const { t } = useI18n();
  const { state, dismiss, retry } = controller;

  if (state.kind === "idle") return null;

  const isSuccess = state.kind === "success";

  const localizedDirection = t(`accessEvents.direction.${state.payload.direction}`);
  const localizedAccessMode = t(`accessEvents.accessMode.${state.payload.accessMode}`);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) dismiss();
      }}
    >
      <DialogContent showCloseButton={false} className="max-w-sm">
        {/* Accessible live region announcement (sr-only) */}
        <div
          role={isSuccess ? "status" : "alert"}
          aria-live={isSuccess ? "polite" : "assertive"}
          aria-atomic="true"
          className="sr-only"
        >
          {isSuccess
            ? t("accessEvents.feedback.successAriaAnnouncement", {
                personName: state.payload.personName,
                direction: localizedDirection,
                accessMode: localizedAccessMode,
              })
            : t("accessEvents.feedback.errorAriaAnnouncement", {
                reason:
                  state.reason ||
                  t("accessEvents.feedback.errorFallbackReason"),
              })}
        </div>

        <div className="flex flex-col items-center text-center gap-4 py-2">
          {isSuccess ? (
            <CheckCircle2
              className="h-12 w-12 text-green-500 shrink-0"
              aria-hidden="true"
            />
          ) : (
            <AlertTriangle
              className="h-12 w-12 text-destructive shrink-0"
              aria-hidden="true"
            />
          )}

          <div className="space-y-1 min-w-0">
            <DialogTitle>
              {isSuccess
                ? t("accessEvents.feedback.successTitle")
                : t("accessEvents.feedback.errorTitle")}
            </DialogTitle>
            <DialogDescription className="break-words">
              {isSuccess
                ? t("accessEvents.feedback.successDescription", {
                    personName: state.payload.personName,
                    direction: localizedDirection,
                    accessMode: localizedAccessMode,
                  })
                : (state.reason ||
                    t("accessEvents.feedback.errorFallbackReason"))}
            </DialogDescription>
          </div>

          {!isSuccess && (
            <div className="flex gap-3 w-full pt-2">
              <Button className="flex-1" onClick={() => retry()}>
                {t("accessEvents.feedback.retry")}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => dismiss()}
              >
                {t("accessEvents.feedback.dismiss")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
