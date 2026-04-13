import { z } from "zod";

const visitPersonTypeEnum = z.enum(["visitor", "service_provider"]);
const visitPersonStatusEnum = z.enum(["allowed", "flagged", "denied"]);
const sortByEnum = z.enum(["full_name", "code", "created_at"]);
const sortOrderEnum = z.enum(["asc", "desc"]);

export const createVisitPersonSchema = z.object({
  type: visitPersonTypeEnum,
  fullName: z.string().min(1).max(255),
  status: visitPersonStatusEnum.default("allowed"),
  phone: z.string().max(30).optional().or(z.literal("")),
  company: z.string().max(255).optional().or(z.literal("")),
  residentId: z.string().uuid().optional(),
  notes: z.string().optional().or(z.literal("")),
});

export type CreateVisitPersonInput = z.infer<typeof createVisitPersonSchema>;

export const updateVisitPersonSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  status: visitPersonStatusEnum.optional(),
  phone: z.string().max(30).optional().or(z.literal("")),
  company: z.string().max(255).optional().or(z.literal("")),
  residentId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().or(z.literal("")),
});

export type UpdateVisitPersonInput = z.infer<typeof updateVisitPersonSchema>;

export const visitPersonFiltersSchema = z.object({
  type: visitPersonTypeEnum.optional(),
  search: z.string().optional(),
  status: visitPersonStatusEnum.optional(),
  sortBy: sortByEnum.default("full_name"),
  sortOrder: sortOrderEnum.default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type VisitPersonFiltersInput = z.infer<typeof visitPersonFiltersSchema>;
