import { useState, useEffect } from "react";
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
import { useTranslation } from "react-i18next";
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
  onSave: (data: AccessEventFormData) => void;
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
  const { t } = useTranslation();

  const [direction, setDirection] = useState<Direction>("entry");
  const [accessMode, setAccessMode] = useState<AccessMode>("vehicle");
  const [vehicleId, setVehicleId] = useState<string>(initialVehicleId ?? "");
  const [notes, setNotes] = useState("");

  // Auto-select only when exactly one vehicle exists
  useEffect(() => {
    if (accessMode === "vehicle" && vehicles?.length === 1 && !vehicleId) {
      setVehicleId(vehicles[0].id);
    }
  }, [accessMode, vehicles, vehicleId]);

  useEffect(() => {
    if (accessMode === "pedestrian") setVehicleId("");
  }, [accessMode]);

  const canSave = accessMode === "pedestrian" || !!vehicleId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      direction,
      accessMode,
      vehicleId: accessMode === "vehicle" ? vehicleId : undefined,
      notes,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <Label>{t("accessEvents.direction.label")}</Label>
        <div className="flex gap-2">
          <Button type="button" variant={direction === "entry" ? "default" : "outline"} size="sm" onClick={() => setDirection("entry")}>
            {t("accessEvents.direction.entry")}
          </Button>
          <Button type="button" variant={direction === "exit" ? "default" : "outline"} size="sm" onClick={() => setDirection("exit")}>
            {t("accessEvents.direction.exit")}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <Label>{t("accessEvents.accessMode.label")}</Label>
        <div className="flex gap-2">
          <Button type="button" variant={accessMode === "pedestrian" ? "default" : "outline"} size="sm" onClick={() => setAccessMode("pedestrian")}>
            {t("accessEvents.accessMode.pedestrian")}
          </Button>
          <Button type="button" variant={accessMode === "vehicle" ? "default" : "outline"} size="sm" onClick={() => setAccessMode("vehicle")}>
            {t("accessEvents.accessMode.vehicle")}
          </Button>
        </div>
      </div>

      {accessMode === "vehicle" && (
        <div className="space-y-3">
          <Label>{t("accessEvents.vehicleSelect.label")}</Label>
          {isLoadingVehicles ? (
            <div className="text-sm text-muted-foreground">...</div>
          ) : vehicles && vehicles.length > 0 ? (
            <>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("accessEvents.vehicleSelect.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      <VehicleOptionContent
                        v={v}
                        tColor={(key) => (t as unknown as (k: string) => string)(key)}
                      />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canManageVehicles && onAddVehicle && (
                <Button type="button" variant="link" size="sm" className="p-0 h-auto" onClick={onAddVehicle}>
                  + {t("accessEvents.vehicleSelect.addVehicle")}
                </Button>
              )}
              {canManageVehicles && onManageVehicles && (
                <Button type="button" variant="link" size="sm" className="p-0 h-auto" onClick={onManageVehicles}>
                  + {t("accessEvents.vehicleSelect.manageVehicles")}
                </Button>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t("vehicles.noVehicles")}</p>
              {canManageVehicles && onAddVehicle && (
                <Button type="button" variant="outline" size="sm" onClick={onAddVehicle}>
                  + {t("accessEvents.vehicleSelect.addVehicle")}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <Label>{t("accessEvents.notes.label")}</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("accessEvents.notes.placeholder")} rows={3} />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isSaving || !canSave} className="flex-1">
          {isSaving ? t("accessEvents.form.saving") : t("accessEvents.form.save")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving} className="flex-1">
          {t("accessEvents.form.cancel")}
        </Button>
      </div>
    </form>
  );
}
