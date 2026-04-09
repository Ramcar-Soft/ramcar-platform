"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from "@ramcar/ui";
import { useTranslations } from "next-intl";
import { useToggleStatus } from "../hooks/use-toggle-status";
import type { ExtendedUserProfile } from "../types";

interface ConfirmStatusDialogProps {
  user: ExtendedUserProfile | null;
  onClose: () => void;
}

export function ConfirmStatusDialog({ user, onClose }: ConfirmStatusDialogProps) {
  const t = useTranslations("users");
  const toggleMutation = useToggleStatus();

  if (!user) return null;

  const isDeactivating = user.status === "active";
  const ns = isDeactivating ? "confirmDeactivate" : "confirmReactivate";

  const handleConfirm = async () => {
    const newStatus = isDeactivating ? "inactive" : "active";
    try {
      await toggleMutation.mutateAsync({ id: user.id, status: newStatus });
      onClose();
    } catch {
      // Error is available via toggleMutation.error
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(`${ns}.title`)}</DialogTitle>
          <DialogDescription>{t(`${ns}.message`)}</DialogDescription>
        </DialogHeader>
        {toggleMutation.error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {toggleMutation.error.message}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={toggleMutation.isPending}>
            {t(`${ns}.cancel`)}
          </Button>
          <Button
            variant={isDeactivating ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={toggleMutation.isPending}
          >
            {t(`${ns}.confirm`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
