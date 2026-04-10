import { z } from "zod";

const directionEnum = z.enum(["entry", "exit"]);
const accessModeEnum = z.enum(["vehicle", "pedestrian"]);
const personTypeEnum = z.enum(["visitor", "service_provider", "resident"]);
const sourceEnum = z.enum(["web", "desktop", "mobile"]);
const sortByEnum = z.enum(["full_name", "email", "created_at"]);
const sortOrderEnum = z.enum(["asc", "desc"]);

export const createAccessEventSchema = z
  .object({
    personType: personTypeEnum,
    userId: z.string().uuid("Invalid user ID"),
    direction: directionEnum,
    accessMode: accessModeEnum,
    vehicleId: z.string().uuid("Invalid vehicle ID").optional(),
    notes: z.string().optional().or(z.literal("")),
    source: sourceEnum,
    eventId: z.string().uuid().optional(),
  })
  .refine(
    (data) => {
      if (data.accessMode === "vehicle") {
        return !!data.vehicleId;
      }
      return true;
    },
    {
      message: "Vehicle is required when access mode is 'vehicle'",
      path: ["vehicleId"],
    },
  );

export type CreateAccessEventInput = z.infer<typeof createAccessEventSchema>;

export const residentFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  sortBy: sortByEnum.default("full_name"),
  sortOrder: sortOrderEnum.default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ResidentFiltersInput = z.infer<typeof residentFiltersSchema>;
