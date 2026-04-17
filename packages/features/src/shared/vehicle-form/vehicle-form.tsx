import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Label, Textarea } from "@ramcar/ui";
import { toast } from "sonner";
import { createVehicleSchema, type VehicleType, type Vehicle, type CreateVehicleInput } from "@ramcar/shared";
import { useI18n, useTransport } from "../../adapters";
import { VehicleTypeSelect } from "./vehicle-type-select";

interface VehicleFormProps {
  userId?: string;
  visitPersonId?: string;
  onSaved: () => void;
  onCancel: () => void;
  initialDraft?: Partial<{
    vehicleType: VehicleType | "";
    brand: string;
    model: string;
    plate: string;
    color: string;
    notes: string;
  }>;
  onDraftChange?: (draft: {
    vehicleType: VehicleType | "";
    brand: string;
    model: string;
    plate: string;
    color: string;
    notes: string;
  }) => void;
}

export function VehicleForm({ userId, visitPersonId, onSaved, onCancel, initialDraft, onDraftChange }: VehicleFormProps) {
  const { t } = useI18n();
  const transport = useTransport();
  const queryClient = useQueryClient();

  const [vehicleType, setVehicleType] = useState<VehicleType | "">(initialDraft?.vehicleType ?? "");
  const [brand, setBrand] = useState(initialDraft?.brand ?? "");
  const [model, setModel] = useState(initialDraft?.model ?? "");
  const [plate, setPlate] = useState(initialDraft?.plate ?? "");
  const [color, setColor] = useState(initialDraft?.color ?? "");
  const [notes, setNotes] = useState(initialDraft?.notes ?? "");

  const notify = (field: string, value: unknown) => {
    onDraftChange?.({
      vehicleType,
      brand,
      model,
      plate,
      color,
      notes,
      [field]: value,
    } as Parameters<typeof onDraftChange>[0]);
  };

  const createVehicle = useMutation({
    mutationFn: (data: CreateVehicleInput) =>
      transport.post<Vehicle>("/vehicles", data),
    onSuccess: (_data, variables) => {
      if (variables.ownerType === "user") {
        queryClient.invalidateQueries({ queryKey: ["residents", variables.userId, "vehicles"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["vehicles", "visit-person", variables.visitPersonId] });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const ownerFields = visitPersonId
      ? { ownerType: "visitPerson" as const, visitPersonId }
      : { ownerType: "user" as const, userId: userId! };

    const result = createVehicleSchema.safeParse({
      ...ownerFields,
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
        toast.success(t("vehicles.messages.created"));
        onSaved();
      },
      onError: () => {
        toast.error(t("vehicles.messages.errorCreating"));
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-semibold">{t("vehicles.title")}</h3>

      <div className="space-y-2">
        <Label>{t("vehicles.vehicleType.label")}</Label>
        <VehicleTypeSelect
          value={vehicleType}
          onChange={(v) => { setVehicleType(v); notify("vehicleType", v); }}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("vehicles.brand.label")}</Label>
        <Input
          value={brand}
          onChange={(e) => { setBrand(e.target.value); notify("brand", e.target.value); }}
          placeholder={t("vehicles.brand.placeholder")}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("vehicles.model.label")}</Label>
        <Input
          value={model}
          onChange={(e) => { setModel(e.target.value); notify("model", e.target.value); }}
          placeholder={t("vehicles.model.placeholder")}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("vehicles.plate.label")}</Label>
        <Input
          value={plate}
          onChange={(e) => { setPlate(e.target.value); notify("plate", e.target.value); }}
          placeholder={t("vehicles.plate.placeholder")}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("vehicles.color.label")}</Label>
        <Input
          value={color}
          onChange={(e) => { setColor(e.target.value); notify("color", e.target.value); }}
          placeholder={t("vehicles.color.placeholder")}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("vehicles.notes.label")}</Label>
        <Textarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value); notify("notes", e.target.value); }}
          placeholder={t("vehicles.notes.placeholder")}
          rows={2}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          disabled={!vehicleType || createVehicle.isPending}
          className="flex-1"
        >
          {createVehicle.isPending ? t("vehicles.form.saving") : t("vehicles.form.save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={createVehicle.isPending}
        >
          {t("vehicles.form.cancel")}
        </Button>
      </div>
    </form>
  );
}
