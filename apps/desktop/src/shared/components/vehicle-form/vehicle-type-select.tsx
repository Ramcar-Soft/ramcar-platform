import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ramcar/ui";
import { useTranslation } from "react-i18next";
import { VEHICLE_TYPES, type VehicleType } from "@ramcar/shared";

interface VehicleTypeSelectProps {
  value: VehicleType | "";
  onChange: (value: VehicleType) => void;
}

export function VehicleTypeSelect({ value, onChange }: VehicleTypeSelectProps) {
  const { t } = useTranslation();

  return (
    <Select value={value} onValueChange={(v) => onChange(v as VehicleType)}>
      <SelectTrigger>
        <SelectValue placeholder={t("vehicles.vehicleType.placeholder")} />
      </SelectTrigger>
      <SelectContent>
        {VEHICLE_TYPES.map((type) => (
          <SelectItem key={type} value={type}>
            {t(`vehicles.vehicleType.${type}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
