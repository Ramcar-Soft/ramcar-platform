import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
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
import { useI18n } from "../../adapters/i18n";
import type { Direction, AccessMode, Vehicle } from "../types";

interface AccessEventFormData {
  direction: Direction;
  accessMode: AccessMode;
  vehicleId?: string;
  notes: string;
}

interface VisitPersonAccessEventFormProps {
  vehicles?: Vehicle[];
  isLoadingVehicles?: boolean;
  onSave: (data: AccessEventFormData) => Promise<void>;
  onCancel: () => void;
  onAddVehicle?: () => void;
  isSaving: boolean;
  initialDraft?: {
    direction: Direction;
    accessMode: AccessMode;
    vehicleId: string;
    notes: string;
  };
  onDraftChange?: (draft: AccessEventFormData) => void;
}

function formatVehicleLabel(v: Vehicle): string {
  const parts = [v.brand, v.model].filter(Boolean).join(" ");
  const plate = v.plate ? ` — ${v.plate}` : "";
  const color = v.color ? ` (${v.color})` : "";
  return `${parts}${plate}${color}` || v.vehicleType;
}

export function VisitPersonAccessEventForm({
  vehicles,
  isLoadingVehicles,
  onSave,
  onCancel,
  onAddVehicle,
  isSaving,
  initialDraft,
  onDraftChange,
}: VisitPersonAccessEventFormProps) {
  const { t } = useI18n();

  const [direction, setDirection] = useState<Direction>(
    initialDraft?.direction ?? "entry",
  );
  const [accessMode, setAccessMode] = useState<AccessMode>(
    initialDraft?.accessMode ?? "vehicle",
  );
  const [vehicleId, setVehicleId] = useState<string>(
    initialDraft?.vehicleId ?? "",
  );
  const [notes, setNotes] = useState(initialDraft?.notes ?? "");

  const composedData = useMemo(
    () => ({ direction, accessMode, vehicleId, notes }),
    [direction, accessMode, vehicleId, notes],
  );

  const onDraftChangeRef = useRef(onDraftChange);
  onDraftChangeRef.current = onDraftChange;

  useEffect(() => {
    onDraftChangeRef.current?.(composedData);
  }, [composedData]);

  useEffect(() => {
    if (accessMode === "vehicle" && vehicles?.length && !vehicleId) {
      setVehicleId(vehicles[0].id);
    }
  }, [accessMode, vehicles, vehicleId]);

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
    } catch {
      toast.error(t("accessEvents.messages.errorCreating"));
    }
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
                      {formatVehicleLabel(v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {onAddVehicle && (
                <Button type="button" variant="link" size="sm" className="p-0 h-auto" onClick={onAddVehicle}>
                  + {t("accessEvents.vehicleSelect.addVehicle")}
                </Button>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t("vehicles.noVehicles")}</p>
              {onAddVehicle && (
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
        <Button type="button" className="flex-1" variant="outline" onClick={onCancel} disabled={isSaving}>
          {t("accessEvents.form.cancel")}
        </Button>
      </div>
    </form>
  );
}
