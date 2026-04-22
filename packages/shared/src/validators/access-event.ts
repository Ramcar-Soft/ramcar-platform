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
    userId: z.string().uuid("Invalid user ID").optional(),
    visitPersonId: z.string().uuid("Invalid visit person ID").optional(),
    direction: directionEnum,
    accessMode: accessModeEnum,
    vehicleId: z.string().uuid("Invalid vehicle ID").optional(),
    notes: z.string().optional().or(z.literal("")),
    source: sourceEnum,
    eventId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.personType === "resident") {
      if (!data.userId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "userId is required for residents",
          path: ["userId"],
        });
      }
      if (data.visitPersonId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "visitPersonId must not be set for residents",
          path: ["visitPersonId"],
        });
      }
    } else {
      if (!data.visitPersonId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "visitPersonId is required for visitors/providers",
          path: ["visitPersonId"],
        });
      }
      if (data.userId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "userId must not be set for visitors/providers",
          path: ["userId"],
        });
      }
    }

    if (data.accessMode === "vehicle" && !data.vehicleId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vehicle is required when access mode is 'vehicle'",
        path: ["vehicleId"],
      });
    }
  });

export type CreateAccessEventInput = z.infer<typeof createAccessEventSchema>;

export const updateAccessEventSchema = z
  .object({
    direction: directionEnum.optional(),
    accessMode: accessModeEnum.optional(),
    vehicleId: z.string().uuid("Invalid vehicle ID").optional().nullable(),
    notes: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.accessMode === "vehicle" && !data.vehicleId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vehicle is required when access mode is 'vehicle'",
        path: ["vehicleId"],
      });
    }
  });

export type UpdateAccessEventInput = z.infer<typeof updateAccessEventSchema>;

export const residentFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  sortBy: sortByEnum.default("full_name"),
  sortOrder: sortOrderEnum.default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ResidentFiltersInput = z.infer<typeof residentFiltersSchema>;

export const accessEventListQuerySchema = z.object({
  personType: z.enum(["visitor", "service_provider", "resident"]),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().refine((v) => [10, 25, 50, 100].includes(v), {
    message: "pageSize must be one of 10, 25, 50, 100",
  }).default(25),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tenantId: z.string().uuid().optional(),
  residentId: z.string().uuid().optional(),
  search: z.string().trim().max(200).optional(),
  locale: z.enum(["en", "es"]).default("en"),
});

export type AccessEventListQueryInput = z.infer<typeof accessEventListQuerySchema>;

export const accessEventExportQuerySchema = accessEventListQuerySchema.omit({ page: true, pageSize: true });
export type AccessEventExportQueryInput = z.infer<typeof accessEventExportQuerySchema>;
