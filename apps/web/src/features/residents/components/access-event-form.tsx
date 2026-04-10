"use client";

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
import { useTranslations } from "next-intl";
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
  isSaving: boolean;
}

function formatVehicleLabel(v: Vehicle): string {
  const parts = [v.brand, v.model].filter(Boolean).join(" ");
  const plate = v.plate ? ` — ${v.plate}` : "";
  const color = v.color ? ` (${v.color})` : "";
  return `${parts}${plate}${color}` || v.vehicleType;
}

export function AccessEventForm({
  vehicles,
  isLoadingVehicles,
  onSave,
  onCancel,
  onAddVehicle,
  isSaving,
}: AccessEventFormProps) {
  const t = useTranslations("accessEvents");
  const tVehicles = useTranslations("vehicles");

  const [direction, setDirection] = useState<Direction>("entry");
  const [accessMode, setAccessMode] = useState<AccessMode>("vehicle");
  const [vehicleId, setVehicleId] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Auto-select first vehicle when none is selected
  useEffect(() => {
    if (accessMode === "vehicle" && vehicles?.length && !vehicleId) {
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
                      {formatVehicleLabel(v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {onAddVehicle && (
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
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {tVehicles("noVehicles")}
              </p>
              {onAddVehicle && (
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
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          {t("form.cancel")}
        </Button>
      </div>
    </form>
  );
}
