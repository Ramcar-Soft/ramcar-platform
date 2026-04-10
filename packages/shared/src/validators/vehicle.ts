import { z } from "zod";

const vehicleTypeEnum = z.enum([
  "car",
  "motorcycle",
  "pickup_truck",
  "truck",
  "bicycle",
  "scooter",
  "other",
]);

export const createVehicleSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  vehicleType: vehicleTypeEnum,
  brand: z.string().max(100).optional().or(z.literal("")),
  model: z.string().max(100).optional().or(z.literal("")),
  plate: z.string().max(20).optional().or(z.literal("")),
  color: z.string().max(50).optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
