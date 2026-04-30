import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from "@ramcar/ui";
import { Pencil, Trash2, ArrowLeft } from "lucide-react";
import type { Vehicle } from "@ramcar/shared";
import { useI18n, useTransport, useRole } from "../../adapters";
import { formatVehicleLabel } from "../vehicle-label";
import { Swatch, resolveSwatch } from "../color-select";
import { VehicleBrandLogo } from "../vehicle-brand-logos";

export type VehicleOwner =
  | { kind: "resident"; userId: string }
  | { kind: "visitPerson"; visitPersonId: string };

interface VehicleManageListProps {
  owner: VehicleOwner;
  vehicles: Vehicle[] | undefined;
  isLoading: boolean;
  canDelete?: boolean;
  onEdit: (vehicle: Vehicle) => void;
  onClose: () => void;
}

export function VehicleManageList({
  owner,
  vehicles,
  isLoading,
  canDelete = true,
  onEdit,
  onClose,
}: VehicleManageListProps) {
  const { t } = useI18n();
  const transport = useTransport();
  const queryClient = useQueryClient();
  const { tenantId } = useRole();

  const [pendingDelete, setPendingDelete] = useState<Vehicle | null>(null);

  const cacheKey =
    owner.kind === "resident"
      ? (["vehicles", tenantId, "resident", owner.userId] as const)
      : (["vehicles", tenantId, "visit-person", owner.visitPersonId] as const);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transport.delete<void>(`/vehicles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKey });
    },
  });

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    deleteMutation.mutate(target.id, {
      onSuccess: () => {
        toast.success(t("vehicles.messages.deleted"));
        setPendingDelete(null);
      },
      onError: (err: unknown) => {
        const status = (err as { status?: number })?.status;
        if (status === 403) {
          toast.error(t("vehicles.messages.forbidden"));
        } else {
          toast.error(t("vehicles.messages.errorDeleting"));
        }
        setPendingDelete(null);
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label={t("vehicles.form.cancel")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-semibold">{t("vehicles.manageTitle")}</h3>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">…</p>
      ) : vehicles && vehicles.length > 0 ? (
        <ul className="space-y-2">
          {vehicles.map((v) => {
            const swatch = v.color ? resolveSwatch(v.color, t) : null;
            return (
              <li
                key={v.id}
                className="flex items-center justify-between gap-2 rounded border p-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <VehicleBrandLogo brand={v.brand} />
                  {swatch && <Swatch variant={swatch.variant} color={swatch.color} />}
                  <span className="truncate">{formatVehicleLabel(v)}</span>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("vehicles.manage.editAction")}
                    onClick={() => onEdit(v)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {canDelete && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("vehicles.manage.deleteAction")}
                      onClick={() => setPendingDelete(v)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("vehicles.manage.empty")}</p>
      )}

      <AlertDialog
        open={canDelete && pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("vehicles.deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? t("vehicles.deleteConfirm.description", {
                    label: formatVehicleLabel(pendingDelete),
                  })
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {t("vehicles.deleteConfirm.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {t("vehicles.deleteConfirm.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
