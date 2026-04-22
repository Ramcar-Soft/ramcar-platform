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

export const currentYear = () => new Date().getFullYear();

const vehicleFields = {
  vehicleType: vehicleTypeEnum,
  brand: z.string().max(100).optional().or(z.literal("")),
  model: z.string().max(100).optional().or(z.literal("")),
  plate: z.string().max(20).optional().or(z.literal("")),
  color: z.string().max(50).optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  year: z
    .number()
    .int()
    .min(1960, "Year must be 1960 or later")
    .max(currentYear() + 1, "Year cannot be in the future beyond next model year")
    .optional(),
};

export const createVehicleSchema = z.discriminatedUnion("ownerType", [
  z.object({
    ownerType: z.literal("user"),
    userId: z.string().uuid("Invalid user ID"),
    ...vehicleFields,
  }),
  z.object({
    ownerType: z.literal("visitPerson"),
    visitPersonId: z.string().uuid("Invalid visit person ID"),
    ...vehicleFields,
  }),
]);

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
