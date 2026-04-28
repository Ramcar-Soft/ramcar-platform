import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Label, Textarea } from "@ramcar/ui";
import { toast } from "sonner";
import {
  createVehicleSchema,
  updateVehicleSchema,
  type VehicleType,
  type Vehicle,
  type CreateVehicleInput,
  type UpdateVehicleInput,
} from "@ramcar/shared";
import { useI18n, useTransport, useRole } from "../../adapters";
import { VehicleTypeSelect } from "./vehicle-type-select";
import { ColorSelect } from "../color-select/color-select";
import { VehicleBrandSelect } from "../vehicle-brand-model/vehicle-brand-select";
import { VehicleModelSelect } from "../vehicle-brand-model/vehicle-model-select";
import { VehicleYearInput } from "../vehicle-brand-model/vehicle-year-input";

interface VehicleFormProps {
  mode?: "create" | "edit";
  vehicle?: Vehicle;
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

export function VehicleForm({
  mode = "create",
  vehicle,
  userId,
  visitPersonId,
  onSaved,
  onCancel,
  initialDraft,
  onDraftChange,
}: VehicleFormProps) {
  const { t } = useI18n();
  const transport = useTransport();
  const queryClient = useQueryClient();
  const { tenantId } = useRole();

  const isEdit = mode === "edit";
  if (isEdit && !vehicle) {
    throw new Error("VehicleForm: mode=\"edit\" requires a vehicle prop");
  }

  const seed = isEdit ? vehicle! : null;

  const [vehicleType, setVehicleType] = useState<VehicleType | "">(
    (seed?.vehicleType as VehicleType | undefined) ?? initialDraft?.vehicleType ?? "",
  );
  const [brand, setBrand] = useState<string | null>(
    seed?.brand ?? initialDraft?.brand ?? null,
  );
  const [model, setModel] = useState<string | null>(
    seed?.model ?? initialDraft?.model ?? null,
  );
  const [plate, setPlate] = useState(seed?.plate ?? initialDraft?.plate ?? "");
  const [color, setColor] = useState(seed?.color ?? initialDraft?.color ?? "");
  const [notes, setNotes] = useState(seed?.notes ?? initialDraft?.notes ?? "");
  const [year, setYear] = useState<number | null>(
    seed?.year ?? initialDraft?.year ?? null,
  );

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
    } as Parameters<NonNullable<typeof onDraftChange>>[0]);
  };

  const cacheKey = (() => {
    const ownerKind = isEdit
      ? vehicle!.userId
        ? "resident"
        : "visit-person"
      : userId
        ? "resident"
        : "visit-person";
    const ownerId = isEdit
      ? (vehicle!.userId ?? vehicle!.visitPersonId)
      : (userId ?? visitPersonId);
    return ["vehicles", tenantId, ownerKind, ownerId] as const;
  })();

  const createVehicle = useMutation({
    mutationFn: (data: CreateVehicleInput) =>
      transport.post<Vehicle>("/vehicles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKey });
    },
  });

  const updateVehicle = useMutation({
    mutationFn: (data: UpdateVehicleInput) =>
      transport.patch<Vehicle>(`/vehicles/${vehicle!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKey });
    },
  });

  const isPending = createVehicle.isPending || updateVehicle.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEdit) {
      const result = updateVehicleSchema.safeParse({
        vehicleType: vehicleType || undefined,
        brand: brand || undefined,
        model: model || undefined,
        plate: plate || undefined,
        color: color || undefined,
        notes: notes || undefined,
        year: year ?? undefined,
      });
      if (!result.success) return;

      updateVehicle.mutate(result.data, {
        onSuccess: (updated) => {
          toast.success(t("vehicles.messages.updated"));
          onSaved(updated);
        },
        onError: (err: unknown) => {
          const status = (err as { status?: number })?.status;
          if (status === 403) {
            toast.error(t("vehicles.messages.forbidden"));
          } else {
            toast.error(t("vehicles.messages.errorUpdating"));
          }
        },
      });
      return;
    }

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
      onSuccess: (created) => {
        toast.success(t("vehicles.messages.created"));
        onSaved(created);
      },
      onError: (err: unknown) => {
        const status = (err as { status?: number })?.status;
        if (status === 403) {
          toast.error(t("vehicles.messages.forbidden"));
        } else {
          toast.error(t("vehicles.messages.errorCreating"));
        }
      },
    });
  };

  const heading = isEdit ? t("vehicles.editTitle") : t("vehicles.title");
  const submitLabel = isPending
    ? t("vehicles.form.saving")
    : isEdit
      ? t("vehicles.form.update")
      : t("vehicles.form.save");

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-semibold">{heading}</h3>

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
          disabled={!vehicleType || isPending}
          className="flex-1"
        >
          {submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={isPending}
        >
          {t("vehicles.form.cancel")}
        </Button>
      </div>
    </form>
  );
}
