import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Label, Textarea } from "@ramcar/ui";
import { toast } from "sonner";
import { createVehicleSchema, type VehicleType, type Vehicle, type CreateVehicleInput } from "@ramcar/shared";
import { useI18n, useTransport, useRole } from "../../adapters";
import { VehicleTypeSelect } from "./vehicle-type-select";
import { ColorSelect } from "../color-select/color-select";
import { VehicleBrandSelect } from "../vehicle-brand-model/vehicle-brand-select";
import { VehicleModelSelect } from "../vehicle-brand-model/vehicle-model-select";
import { VehicleYearInput } from "../vehicle-brand-model/vehicle-year-input";

interface VehicleFormProps {
  userId?: string;
  visitPersonId?: string;
  onSaved: (vehicle: Vehicle) => void;
  onCancel: () => void;
  initialDraft?: Partial<{
    vehicleType: VehicleType | "";
    brand: string;
    model: string;
    plate: string;
    color: string;
    notes: string;
    year: number | null;
  }>;
  onDraftChange?: (draft: {
    vehicleType: VehicleType | "";
    brand: string;
    model: string;
    plate: string;
    color: string;
    notes: string;
    year: number | null;
  }) => void;
}

export function VehicleForm({ userId, visitPersonId, onSaved, onCancel, initialDraft, onDraftChange }: VehicleFormProps) {
  const { t } = useI18n();
  const transport = useTransport();
  const queryClient = useQueryClient();
  const { tenantId } = useRole();

  const [vehicleType, setVehicleType] = useState<VehicleType | "">(initialDraft?.vehicleType ?? "");
  const [brand, setBrand] = useState<string | null>(initialDraft?.brand ?? null);
  const [model, setModel] = useState<string | null>(initialDraft?.model ?? null);
  const [plate, setPlate] = useState(initialDraft?.plate ?? "");
  const [color, setColor] = useState(initialDraft?.color ?? "");
  const [notes, setNotes] = useState(initialDraft?.notes ?? "");
  const [year, setYear] = useState<number | null>(initialDraft?.year ?? null);

  const modelInputRef = useRef<HTMLElement | null>(null);

  const notify = (field: string, value: unknown) => {
    onDraftChange?.({
      vehicleType,
      brand: brand ?? "",
      model: model ?? "",
      plate,
      color,
      notes,
      year,
      [field]: value,
    } as Parameters<typeof onDraftChange>[0]);
  };

  const createVehicle = useMutation({
    mutationFn: (data: CreateVehicleInput) =>
      transport.post<Vehicle>("/vehicles", data),
    onSuccess: (_data, variables) => {
      const key =
        variables.ownerType === "user"
          ? ["vehicles", tenantId, "resident", variables.userId]
          : ["vehicles", tenantId, "visit-person", variables.visitPersonId];
      queryClient.invalidateQueries({ queryKey: key });
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
      year: year ?? undefined,
    });

    if (!result.success) return;

    createVehicle.mutate(result.data, {
      onSuccess: (vehicle) => {
        toast.success(t("vehicles.messages.created"));
        onSaved(vehicle);
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
        <VehicleBrandSelect
          value={brand}
          onChange={(next) => {
            setBrand(next);
            if (next !== brand) {
              setModel(null);
              notify("model", null);
            }
            notify("brand", next ?? "");
          }}
          modelInputRef={modelInputRef}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("vehicles.model.label")}</Label>
        <VehicleModelSelect
          brand={brand}
          value={model}
          onChange={(next) => { setModel(next); notify("model", next ?? ""); }}
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
        <ColorSelect
          value={color || null}
          onChange={(hex) => {
            const v = hex ?? "";
            setColor(v);
            notify("color", v);
          }}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("vehicles.year.label")}</Label>
        <VehicleYearInput
          value={year}
          onChange={(next) => { setYear(next); notify("year", next); }}
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
