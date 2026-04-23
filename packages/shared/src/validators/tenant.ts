import { z } from "zod";

export const tenantStatusSchema = z.enum(["active", "inactive"]);
export type TenantStatus = z.infer<typeof tenantStatusSchema>;

export const tenantNameSchema = z
  .string()
  .trim()
  .min(1, "tenants.validation.nameRequired")
  .max(255, "tenants.validation.nameTooLong");

export const tenantAddressSchema = z
  .string()
  .trim()
  .min(1, "tenants.validation.addressRequired");

export const tenantConfigSchema = z.record(z.unknown()).default({});

export const createTenantSchema = z.object({
  name: tenantNameSchema,
  address: tenantAddressSchema,
  status: tenantStatusSchema.default("active"),
  config: tenantConfigSchema.optional(),
});
export type CreateTenantInput = z.input<typeof createTenantSchema>;
export type CreateTenantDto = z.output<typeof createTenantSchema>;

export const updateTenantSchema = z
  .object({
    name: tenantNameSchema.optional(),
    address: tenantAddressSchema.optional(),
    status: tenantStatusSchema.optional(),
    config: tenantConfigSchema.optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.address !== undefined ||
      v.status !== undefined ||
      v.config !== undefined,
    { message: "tenants.validation.atLeastOneField" },
  );
export type UpdateTenantInput = z.input<typeof updateTenantSchema>;
export type UpdateTenantDto = z.output<typeof updateTenantSchema>;

export const tenantListQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(["active", "inactive", "all"]).default("active"),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z
    .enum(["10", "25", "50", "100"])
    .transform((v) => Number(v) as 10 | 25 | 50 | 100)
    .default("25"),
  scope: z.enum(["selector"]).optional(),
  include_inactive: z.coerce.boolean().default(false),
});
export type TenantListQuery = z.output<typeof tenantListQuerySchema>;

export const TENANT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const TENANT_IMAGE_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type TenantImageMime = (typeof TENANT_IMAGE_ALLOWED_MIME)[number];

export const tenantImageFileSchema = z.object({
  name: z.string(),
  size: z
    .number()
    .int()
    .positive()
    .max(TENANT_IMAGE_MAX_BYTES, "tenants.validation.imageTooLarge"),
  type: z
    .enum([...TENANT_IMAGE_ALLOWED_MIME])
    .refine((t) => TENANT_IMAGE_ALLOWED_MIME.includes(t as TenantImageMime), {
      message: "tenants.validation.imageWrongType",
    }),
});

export const tenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  address: z.string(),
  status: tenantStatusSchema,
  config: z.record(z.unknown()),
  image_path: z.string().nullable(),
  time_zone: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Tenant = z.output<typeof tenantSchema>;

export const tenantSelectorProjectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  status: tenantStatusSchema,
  image_path: z.string().nullable(),
});
export type TenantSelectorProjection = z.output<typeof tenantSelectorProjectionSchema>;

export const paginatedTenantResponseSchema = z.object({
  data: z.array(tenantSchema),
  meta: z.object({
    page: z.number().int().min(1),
    page_size: z.number().int().min(1),
    total: z.number().int().min(0),
    total_pages: z.number().int().min(0),
  }),
});

export const paginatedTenantSelectorResponseSchema = z.object({
  data: z.array(tenantSelectorProjectionSchema),
  meta: z.object({
    page: z.number().int().min(1),
    page_size: z.number().int().min(1),
    total: z.number().int().min(0),
    total_pages: z.number().int().min(0),
  }),
});
