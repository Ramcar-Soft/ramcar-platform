"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ramcar/ui";
import { useTranslations } from "next-intl";
import { VEHICLE_TYPES, type VehicleType } from "@ramcar/shared";

interface VehicleTypeSelectProps {
  value: VehicleType | "";
  onChange: (value: VehicleType) => void;
}

export function VehicleTypeSelect({ value, onChange }: VehicleTypeSelectProps) {
  const t = useTranslations("vehicles.vehicleType");

  return (
    <Select value={value} onValueChange={(v) => onChange(v as VehicleType)}>
      <SelectTrigger>
        <SelectValue placeholder={t("placeholder")} />
      </SelectTrigger>
      <SelectContent>
        {VEHICLE_TYPES.map((type) => (
          <SelectItem key={type} value={type}>
            {t(type)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
