import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ramcar/ui";
import { VEHICLE_TYPES, type VehicleType } from "@ramcar/shared";
import { useI18n } from "../../adapters";

interface VehicleTypeSelectProps {
  value: VehicleType | "";
  onChange: (value: VehicleType) => void;
}

export function VehicleTypeSelect({ value, onChange }: VehicleTypeSelectProps) {
  const { t } = useI18n();

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
