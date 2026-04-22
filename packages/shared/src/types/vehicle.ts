export type VehicleType =
  | "car"
  | "motorcycle"
  | "pickup_truck"
  | "truck"
  | "bicycle"
  | "scooter"
  | "other";

export const VEHICLE_TYPES: readonly VehicleType[] = [
  "car",
  "motorcycle",
  "pickup_truck",
  "truck",
  "bicycle",
  "scooter",
  "other",
] as const;

export interface Vehicle {
  id: string;
  tenantId: string;
  userId: string | null;
  visitPersonId: string | null;
  vehicleType: VehicleType;
  brand: string | null;
  model: string | null;
  plate: string | null;
  color: string | null;
  notes: string | null;
  year: number | null;
  createdAt: string;
  updatedAt: string;
}
