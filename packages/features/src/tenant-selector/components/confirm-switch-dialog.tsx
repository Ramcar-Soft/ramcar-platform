import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from "@ramcar/ui";
import { useI18n } from "../../adapters/i18n";

interface ConfirmSwitchDialogProps {
  open: boolean;
  sourceTenantName: string;
  targetTenantName: string;
  hasUnsavedChanges: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmSwitchDialog({
  open,
  sourceTenantName,
  targetTenantName,
  hasUnsavedChanges,
  onCancel,
  onConfirm,
}: ConfirmSwitchDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <DialogContent
        className="sm:max-w-lg!"
        onEscapeKeyDown={onCancel}
        onInteractOutside={onCancel}
      >
        <DialogHeader>
          <DialogTitle>{t("tenantSelector.confirm.title")}</DialogTitle>
          <DialogDescription>
            {t("tenantSelector.confirm.body", { source: sourceTenantName, target: targetTenantName })}
          </DialogDescription>
        </DialogHeader>
        {hasUnsavedChanges && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{t("tenantSelector.confirm.unsavedWarning")}</span>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} autoFocus>
            {t("tenantSelector.confirm.cancel")}
          </Button>
          <Button onClick={onConfirm}>
            {t("tenantSelector.confirm.confirm", { target: targetTenantName })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
