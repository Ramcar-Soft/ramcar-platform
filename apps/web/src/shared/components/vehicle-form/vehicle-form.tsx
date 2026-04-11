"use client";

import { useState, useEffect, useMemo } from "react";
import { useFormPersistence } from "@/shared/hooks/use-form-persistence";
import { Button, Input, Label, Textarea } from "@ramcar/ui";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createVehicleSchema, type VehicleType } from "@ramcar/shared";
import { useCreateVehicle } from "@/features/residents/hooks/use-create-vehicle";
import { VehicleTypeSelect } from "./vehicle-type-select";

interface VehicleFormProps {
  userId: string;
  onSaved: () => void;
  onCancel: () => void;
}

export function VehicleForm({ userId, onSaved, onCancel }: VehicleFormProps) {
  const t = useTranslations("vehicles");
  const createVehicle = useCreateVehicle();

  const [vehicleType, setVehicleType] = useState<VehicleType | "">("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [color, setColor] = useState("");
  const [notes, setNotes] = useState("");

  const tCommon = useTranslations("common");

  const composedData = useMemo(
    () => ({ vehicleType, brand, model, plate, color, notes }),
    [vehicleType, brand, model, plate, color, notes],
  );

  const { wasRestored, discardDraft, clearDraft } = useFormPersistence(
    "vehicle-create",
    composedData,
    {
      onRestore: (draft) => {
        setVehicleType(draft.vehicleType ?? "");
        setBrand(draft.brand ?? "");
        setModel(draft.model ?? "");
        setPlate(draft.plate ?? "");
        setColor(draft.color ?? "");
        setNotes(draft.notes ?? "");
      },
    },
  );

  useEffect(() => {
    if (wasRestored) {
      toast.info(tCommon("draftRestored", { time: "" }), {
        action: {
          label: tCommon("discardDraft"),
          onClick: () => discardDraft(),
        },
      });
    }
  }, [wasRestored, tCommon, discardDraft]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const result = createVehicleSchema.safeParse({
      userId,
      vehicleType,
      brand: brand || undefined,
      model: model || undefined,
      plate: plate || undefined,
      color: color || undefined,
      notes: notes || undefined,
    });

    if (!result.success) return;

    createVehicle.mutate(result.data, {
      onSuccess: () => {
        clearDraft();
        toast.success(t("messages.created"));
        onSaved();
      },
      onError: () => {
        toast.error(t("messages.errorCreating"));
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-semibold">{t("title")}</h3>

      <div className="space-y-2">
        <Label>{t("vehicleType.label")}</Label>
        <VehicleTypeSelect value={vehicleType} onChange={setVehicleType} />
      </div>

      <div className="space-y-2">
        <Label>{t("brand.label")}</Label>
        <Input
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder={t("brand.placeholder")}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("model.label")}</Label>
        <Input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={t("model.placeholder")}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("plate.label")}</Label>
        <Input
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          placeholder={t("plate.placeholder")}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("color.label")}</Label>
        <Input
          value={color}
          onChange={(e) => setColor(e.target.value)}
          placeholder={t("color.placeholder")}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("notes.label")}</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("notes.placeholder")}
          rows={2}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          disabled={!vehicleType || createVehicle.isPending}
          className="flex-1"
        >
          {createVehicle.isPending ? t("form.saving") : t("form.save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            discardDraft();
            onCancel();
          }}
          disabled={createVehicle.isPending}
        >
          {t("form.cancel")}
        </Button>
      </div>
    </form>
  );
}
