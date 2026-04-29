import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ramcar/ui";
import { useI18n } from "../../adapters/i18n";

interface ContactSupportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ContactSupportDialog({ open, onClose }: ContactSupportDialogProps) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent
        className="sm:max-w-[500px]!"
        onEscapeKeyDown={onClose}
        onInteractOutside={onClose}
      >
        <DialogHeader>
          <DialogTitle className="py-6">{t("tenants.contactSupport.title")}</DialogTitle>
          <DialogDescription>{t("tenants.contactSupport.body")}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t("tenants.contactSupport.supportInstruction")}
        </p>
        <DialogFooter>
          <Button onClick={onClose} autoFocus>
            {t("tenants.contactSupport.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
