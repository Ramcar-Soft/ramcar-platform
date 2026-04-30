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
  disabled?: boolean;
}

export function VehicleTypeSelect({ value, onChange, disabled }: VehicleTypeSelectProps) {
  const { t } = useI18n();

  return (
    <Select value={value} onValueChange={(v) => onChange(v as VehicleType)} disabled={disabled}>
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
