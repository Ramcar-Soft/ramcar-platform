"use client";

import { useState, useEffect, useMemo } from "react";
import { useFormPersistence } from "@/shared/hooks/use-form-persistence";
import {
  Button,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ramcar/ui";
import { useTranslations } from "next-intl";
import { formatVehicleLabel } from "@ramcar/features/shared/vehicle-label";
import { Swatch, resolveSwatch } from "@ramcar/features/shared/color-select";
import type { Direction, AccessMode, Vehicle } from "@ramcar/shared";

interface AccessEventFormData {
  direction: Direction;
  accessMode: AccessMode;
  vehicleId?: string;
  notes: string;
}

interface AccessEventFormProps {
  vehicles?: Vehicle[];
  isLoadingVehicles?: boolean;
  onSave: (data: AccessEventFormData) => Promise<void>;
  onCancel: () => void;
  onAddVehicle?: () => void;
  onManageVehicles?: () => void;
  canManageVehicles?: boolean;
  isSaving: boolean;
  initialVehicleId?: string | null;
}

function VehicleOptionContent({
  v,
  tColor,
}: {
  v: Vehicle;
  tColor: (key: string) => string;
}) {
  if (v.color == null) {
    return <span>{formatVehicleLabel(v)}</span>;
  }
  const resolved = resolveSwatch(v.color, tColor);
  return (
    <span className="flex items-center gap-2">
      <span>{formatVehicleLabel(v)}</span>
      <Swatch variant={resolved.variant} color={resolved.color} />
      <span>{resolved.label}</span>
    </span>
  );
}

export function AccessEventForm({
  vehicles,
  isLoadingVehicles,
  onSave,
  onCancel,
  onAddVehicle,
  onManageVehicles,
  canManageVehicles = false,
  isSaving,
  initialVehicleId,
}: AccessEventFormProps) {
  const t = useTranslations("accessEvents");
  const tVehicles = useTranslations("vehicles");
  const tRoot = useTranslations();
  const tColor = (key: string): string => tRoot(key);

  const [direction, setDirection] = useState<Direction>("entry");
  const [accessMode, setAccessMode] = useState<AccessMode>("vehicle");
  const [vehicleId, setVehicleId] = useState<string>(initialVehicleId ?? "");
  const [notes, setNotes] = useState("");

  const tCommon = useTranslations("common");

  const composedData = useMemo(
    () => ({ direction, accessMode, vehicleId, notes }),
    [direction, accessMode, vehicleId, notes],
  );

  const { wasRestored, discardDraft, clearDraft } = useFormPersistence(
    "access-event-create",
    composedData,
    {
      onRestore: (draft) => {
        setDirection(draft.direction ?? "entry");
        setAccessMode(draft.accessMode ?? "vehicle");
        setVehicleId(initialVehicleId ?? draft.vehicleId ?? "");
        setNotes(draft.notes ?? "");
      },
    },
  );

  useEffect(() => {
    if (wasRestored) {
      console.log(tCommon("draftRestored", { time: "" }));
    }
  }, [wasRestored, tCommon, discardDraft]);

  // Auto-select only when exactly one vehicle exists
  useEffect(() => {
    if (accessMode === "vehicle" && vehicles?.length === 1 && !vehicleId) {
      setVehicleId(vehicles[0].id);
    }
  }, [accessMode, vehicles, vehicleId]);

  // Clear vehicleId when switching to pedestrian
  useEffect(() => {
    if (accessMode === "pedestrian") {
      setVehicleId("");
    }
  }, [accessMode]);

  const canSave = accessMode === "pedestrian" || !!vehicleId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave({
        direction,
        accessMode,
        vehicleId: accessMode === "vehicle" ? vehicleId : undefined,
        notes,
      });
      clearDraft();
    } catch {
      // Error is surfaced by the parent page-client's AccessEventFeedbackOverlay
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <Label>{t("direction.label")}</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={direction === "entry" ? "default" : "outline"}
            size="sm"
            onClick={() => setDirection("entry")}
          >
            {t("direction.entry")}
          </Button>
          <Button
            type="button"
            variant={direction === "exit" ? "default" : "outline"}
            size="sm"
            onClick={() => setDirection("exit")}
          >
            {t("direction.exit")}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <Label>{t("accessMode.label")}</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={accessMode === "pedestrian" ? "default" : "outline"}
            size="sm"
            onClick={() => setAccessMode("pedestrian")}
          >
            {t("accessMode.pedestrian")}
          </Button>
          <Button
            type="button"
            variant={accessMode === "vehicle" ? "default" : "outline"}
            size="sm"
            onClick={() => setAccessMode("vehicle")}
          >
            {t("accessMode.vehicle")}
          </Button>
        </div>
      </div>

      {accessMode === "vehicle" && (
        <div className="space-y-3">
          <Label>{t("vehicleSelect.label")}</Label>
          {isLoadingVehicles ? (
            <div className="text-sm text-muted-foreground">...</div>
          ) : vehicles && vehicles.length > 0 ? (
            <>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("vehicleSelect.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      <VehicleOptionContent v={v} tColor={tColor} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canManageVehicles && onAddVehicle && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="p-0 h-auto"
                  onClick={onAddVehicle}
                >
                  + {t("vehicleSelect.addVehicle")}
                </Button>
              )}
              {canManageVehicles && onManageVehicles && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="p-0 h-auto"
                  onClick={onManageVehicles}
                >
                  + {t("vehicleSelect.manageVehicles")}
                </Button>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {canManageVehicles
                  ? tVehicles("noVehicles")
                  : tVehicles("noVehiclesAskAdmin")}
              </p>
              {canManageVehicles && onAddVehicle && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onAddVehicle}
                >
                  + {t("vehicleSelect.addVehicle")}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <Label>{t("notes.label")}</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("notes.placeholder")}
          rows={3}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isSaving || !canSave} className="flex-1">
          {isSaving ? t("form.saving") : t("form.save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => {
            discardDraft();
            onCancel();
          }}
          disabled={isSaving}
        >
          {t("form.cancel")}
        </Button>
      </div>
    </form>
  );
}
