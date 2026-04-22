export interface VehicleLabelInput {
  brand?: string | null;
  model?: string | null;
  plate?: string | null;
  vehicleType: string;
}

export function formatVehicleLabel(v: VehicleLabelInput): string {
  const parts = [v.brand, v.model].filter(Boolean).join(" ");
  const plate = v.plate ? ` — ${v.plate}` : "";
  return `${parts}${plate}` || v.vehicleType;
}
