# Zod DTO Contracts — `@ramcar/shared/validators/tenant.ts`

**Purpose**: Single-source Zod schemas reused by NestJS request pipes AND frontend forms (Constitution Principle V). This file is the contract between the API and both apps' forms.

---

## 1. New file: `packages/shared/src/validators/tenant.ts`

```ts
import { z } from "zod";

// -----------------------------------------------------------------------------
// Tenant basics
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Request DTOs (input)
// -----------------------------------------------------------------------------

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
    (v) => v.name !== undefined || v.address !== undefined || v.status !== undefined || v.config !== undefined,
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

// -----------------------------------------------------------------------------
// Image upload (multipart is validated by NestJS FileInterceptor; this schema
// validates the file metadata on the frontend pre-upload check)
// -----------------------------------------------------------------------------

export const TENANT_IMAGE_MAX_BYTES = 2 * 1024 * 1024; // 2 MiB (FR-035d)
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
    .refine((t) => TENANT_IMAGE_ALLOWED_MIME.includes(t), {
      message: "tenants.validation.imageWrongType",
    }),
});

// -----------------------------------------------------------------------------
// Response DTOs (output) — used by frontend types
// -----------------------------------------------------------------------------

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
```

---

## 2. User DTO extensions — `packages/shared/src/validators/user.ts`

This feature extends the existing `createUserSchema` and `updateUserSchema`. Pattern-only here; exact edits land on the existing file.

```ts
import { z } from "zod";
// … existing imports …

const tenantIdsArray = z
  .array(z.string().uuid())
  .min(1, "users.validation.atLeastOneTenant")
  .max(50, "users.validation.tooManyTenants"); // FR-060 ceiling

const adminGuardTenantFields = z
  .object({
    tenant_ids: tenantIdsArray,
    primary_tenant_id: z.string().uuid(),
  })
  .refine(
    (v) => v.tenant_ids.includes(v.primary_tenant_id),
    { message: "users.validation.primaryMustBeSelected", path: ["primary_tenant_id"] },
  );

const residentTenantField = z.object({
  tenant_id: z.string().uuid(),
});

const baseCreateUser = z.object({
  email: z.string().email(),
  full_name: z.string().trim().min(1).max(255),
  // … other existing fields …
});

export const createUserSchema = z.discriminatedUnion("role", [
  baseCreateUser.extend({ role: z.literal("resident") }).merge(residentTenantField),
  baseCreateUser.extend({ role: z.literal("admin") }).and(adminGuardTenantFields),
  baseCreateUser.extend({ role: z.literal("guard") }).and(adminGuardTenantFields),
  baseCreateUser.extend({ role: z.literal("super_admin") }), // no tenant fields
]);
export type CreateUserInput = z.input<typeof createUserSchema>;

// updateUserSchema: analogous, with `.partial()` applied to the base shape. Tenant
// fields remain required for admin/guard if the role is being set — validated by
// the discriminated union branch.
```

**Why `z.discriminatedUnion("role", …)`**: guarantees compile-time exhaustiveness. A developer who adds a new role at the type level sees every Zod schema branch flagged by the build.

**Why `baseCreateUser.and(adminGuardTenantFields)` instead of `.merge()`**: `.merge()` would discard the `.refine()` on `adminGuardTenantFields`. `.and()` preserves refinements; Zod's docs call this out for this exact scenario.

---

## 3. NestJS pipe wiring

The existing `ZodValidationPipe` (in `apps/api/src/common/pipes/zod-validation.pipe.ts` per spec 008) is reused verbatim. New controller handlers register the schemas:

```ts
// apps/api/src/modules/tenants/tenants.controller.ts
@Post()
@UsePipes(new ZodValidationPipe(createTenantSchema))
async create(@Body() dto: CreateTenantDto, /* … */) { … }
```

No new pipe is introduced; the validation contract is the Zod schema itself.

---

## 4. Frontend form wiring

### 4.1 Tenant create/edit form (`apps/web/src/features/tenants/components/tenant-form.tsx`)

```ts
import { createTenantSchema, updateTenantSchema } from "@ramcar/shared/validators/tenant";

function validateOnSubmit(mode: "create" | "edit", values: unknown) {
  const schema = mode === "create" ? createTenantSchema : updateTenantSchema;
  return schema.safeParse(values);
}
```

The form does not use `react-hook-form` elsewhere in the repo; existing forms (`user-form.tsx`, `visit-person-form.tsx`) use a plain `useState` + per-field error object pattern. The tenant form follows suit for consistency.

### 4.2 User form tenant multi-select (`apps/web/src/features/users/components/user-form.tsx`)

Uses the extended `createUserSchema` / `updateUserSchema`. The validation path for admin/guard runs the `adminGuardTenantFields.refine(...)` check, producing a `path: ["primary_tenant_id"]` issue that the form surfaces next to the primary-selector control.

---

## 5. Error payload shape

All Zod validation failures are mapped by the existing `ZodValidationPipe` to:

```json
{
  "statusCode": 422,
  "message": "Validation failed",
  "details": [
    { "path": ["address"], "message": "tenants.validation.addressRequired" },
    { "path": ["primary_tenant_id"], "message": "users.validation.primaryMustBeSelected" }
  ]
}
```

The frontend's `apiClient` already maps this shape into form errors (spec 009 pattern).

The `.message` values are **i18n keys**, not user-facing strings. The frontend form code resolves them via the existing `useTranslations` hook. Backend returns the key verbatim; the frontend chooses the language.

---

## 6. Package export additions

`packages/shared/src/index.ts`:

```ts
export * from "./validators/tenant";
export type { TenantStatus, Tenant, TenantSelectorProjection, TenantListQuery, CreateTenantDto, UpdateTenantDto } from "./validators/tenant";
```

And re-export the new entity types for frontend convenience:

```ts
export type { UserTenant } from "./types/user-tenant";
```
