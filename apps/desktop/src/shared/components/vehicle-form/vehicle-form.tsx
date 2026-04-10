import { useState } from "react";
import { Button, Input, Label, Textarea } from "@ramcar/ui";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { createVehicleSchema, type VehicleType, type Vehicle, type CreateVehicleInput } from "@ramcar/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";

function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVehicleInput) =>
      apiClient.post<Vehicle>("/vehicles", data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["residents", variables.userId, "vehicles"],
      });
    },
  });
}
import { VehicleTypeSelect } from "./vehicle-type-select";

interface VehicleFormProps {
  userId: string;
  onSaved: () => void;
  onCancel: () => void;
}

export function VehicleForm({ userId, onSaved, onCancel }: VehicleFormProps) {
  const { t } = useTranslation();
  const createVehicle = useCreateVehicle();

  const [vehicleType, setVehicleType] = useState<VehicleType | "">("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [color, setColor] = useState("");
  const [notes, setNotes] = useState("");

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
        <VehicleTypeSelect value={vehicleType} onChange={setVehicleType} />
      </div>
      <div className="space-y-2">
        <Label>{t("vehicles.brand.label")}</Label>
        <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder={t("vehicles.brand.placeholder")} />
      </div>
      <div className="space-y-2">
        <Label>{t("vehicles.model.label")}</Label>
        <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder={t("vehicles.model.placeholder")} />
      </div>
      <div className="space-y-2">
        <Label>{t("vehicles.plate.label")}</Label>
        <Input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder={t("vehicles.plate.placeholder")} />
      </div>
      <div className="space-y-2">
        <Label>{t("vehicles.color.label")}</Label>
        <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder={t("vehicles.color.placeholder")} />
      </div>
      <div className="space-y-2">
        <Label>{t("vehicles.notes.label")}</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("vehicles.notes.placeholder")} rows={2} />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={!vehicleType || createVehicle.isPending} className="flex-1">
          {createVehicle.isPending ? t("vehicles.form.saving") : t("vehicles.form.save")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={createVehicle.isPending}>
          {t("vehicles.form.cancel")}
        </Button>
      </div>
    </form>
  );
}
