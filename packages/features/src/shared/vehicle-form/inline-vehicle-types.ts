import type { VehicleType } from "@ramcar/shared";

export type OwnerKind = "resident" | "visitPerson";

export type InlineVehicleEntryStatus = "draft" | "saving" | "saved" | "error";

export interface InlineVehicleEntryFields {
  clientId: string;
  vehicleType: VehicleType | "";
  brand: string;
  model: string;
  plate: string;
  color: string;
  year: number | null;
  notes: string;
}

export interface InlineVehicleEntry extends InlineVehicleEntryFields {
  status: InlineVehicleEntryStatus;
  vehicleId?: string;
  errorMessage?: string;
  fieldErrors?: Partial<Record<keyof InlineVehicleEntryFields, string>>;
}
