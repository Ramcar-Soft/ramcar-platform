import { Input } from "@ramcar/ui";

export interface VehicleYearInputProps {
  value: number | null;
  onChange: (year: number | null) => void;
  disabled?: boolean;
  id?: string;
}

const YEAR_MIN = 1960;
const currentYear = () => new Date().getFullYear();

export function VehicleYearInput({ value, onChange, disabled, id }: VehicleYearInputProps) {
  return (
    <Input
      id={id}
      type="number"
      inputMode="numeric"
      min={YEAR_MIN}
      max={currentYear() + 1}
      step={1}
      disabled={disabled}
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        if (!raw || !raw.trim()) {
          onChange(null);
        } else {
          const parsed = parseInt(raw, 10);
          onChange(isNaN(parsed) ? null : parsed);
        }
      }}
    />
  );
}
