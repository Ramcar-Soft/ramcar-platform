import { z } from "zod";

const phoneTypeEnum = z.enum(["house", "cellphone", "work", "primary"]);
const userStatusEnum = z.enum(["active", "inactive"]);
const roleEnum = z.enum(["super_admin", "admin", "guard", "resident"]);
const sortByEnum = z.enum([
  "full_name",
  "email",
  "role",
  "status",
  "created_at",
]);
const sortOrderEnum = z.enum(["asc", "desc"]);

const tenantIdsArray = z
  .array(z.string().uuid())
  .min(1, "users.validation.atLeastOneTenant")
  .max(50, "users.validation.tooManyTenants");

const adminGuardTenantObj = z.object({
  tenant_ids: tenantIdsArray,
  primary_tenant_id: z.string().uuid(),
});

const baseCreateUserObj = z.object({
  fullName: z.string().min(1, "Full name is required").max(255),
  email: z.string().email("Invalid email address"),
  address: z.string().min(1, "Address is required").max(500),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50)
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    ),
  phone: z.string().min(1, "Phone is required").max(20),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional()
    .or(z.literal("")),
  confirmPassword: z.string().optional().or(z.literal("")),
  phoneType: phoneTypeEnum.optional(),
  userGroupIds: z.array(z.string().uuid()).default([]),
  observations: z.string().max(1000).optional().or(z.literal("")),
});

function passwordRefine<T extends { password?: string | null; confirmPassword?: string | null }>(
  data: T,
): boolean {
  if (data.password && data.password.length > 0) {
    return data.password === data.confirmPassword;
  }
  return true;
}

const residentCreateBranch = baseCreateUserObj.extend({
  role: z.literal("resident"),
  tenantId: z.string().uuid("Invalid tenant ID"),
});

const adminCreateBranch = baseCreateUserObj
  .extend({ role: z.literal("admin") })
  .merge(adminGuardTenantObj)
  .refine((v) => v.tenant_ids.includes(v.primary_tenant_id), {
    message: "users.validation.primaryMustBeSelected",
    path: ["primary_tenant_id"],
  });

const guardCreateBranch = baseCreateUserObj
  .extend({ role: z.literal("guard") })
  .merge(adminGuardTenantObj)
  .refine((v) => v.tenant_ids.includes(v.primary_tenant_id), {
    message: "users.validation.primaryMustBeSelected",
    path: ["primary_tenant_id"],
  });

const superAdminCreateBranch = baseCreateUserObj.extend({ role: z.literal("super_admin") });

export const createUserSchema = z
  .union([residentCreateBranch, adminCreateBranch, guardCreateBranch, superAdminCreateBranch])
  .refine(passwordRefine, { message: "Passwords do not match", path: ["confirmPassword"] });

export type CreateUserInput = z.input<typeof createUserSchema>;

const baseUpdateUserObj = z.object({
  fullName: z.string().min(1, "Full name is required").max(255).optional(),
  email: z.string().email("Invalid email address").optional(),
  address: z.string().min(1, "Address is required").max(500).optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50)
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    )
    .optional(),
  phone: z.string().min(1, "Phone is required").max(20).optional(),
  phoneType: phoneTypeEnum.optional().nullable(),
  userGroupIds: z.array(z.string().uuid()).optional(),
  observations: z.string().max(1000).optional().nullable(),
});

const adminGuardTenantObjPartial = z.object({
  tenant_ids: tenantIdsArray.optional(),
  primary_tenant_id: z.string().uuid().optional(),
});

const residentUpdateBranch = baseUpdateUserObj.extend({
  role: z.literal("resident"),
  tenantId: z.string().uuid().optional(),
});

const adminUpdateBranch = baseUpdateUserObj
  .extend({ role: z.literal("admin") })
  .merge(adminGuardTenantObjPartial)
  .refine(
    (v) => !v.tenant_ids || !v.primary_tenant_id || v.tenant_ids.includes(v.primary_tenant_id),
    { message: "users.validation.primaryMustBeSelected", path: ["primary_tenant_id"] },
  );

const guardUpdateBranch = baseUpdateUserObj
  .extend({ role: z.literal("guard") })
  .merge(adminGuardTenantObjPartial)
  .refine(
    (v) => !v.tenant_ids || !v.primary_tenant_id || v.tenant_ids.includes(v.primary_tenant_id),
    { message: "users.validation.primaryMustBeSelected", path: ["primary_tenant_id"] },
  );

const superAdminUpdateBranch = baseUpdateUserObj.extend({ role: z.literal("super_admin") });

export const updateUserSchema = z.union([
  residentUpdateBranch,
  adminUpdateBranch,
  guardUpdateBranch,
  superAdminUpdateBranch,
]);

export type UpdateUserInput = z.input<typeof updateUserSchema>;

export const userFiltersSchema = z.object({
  search: z.string().optional(),
  tenantId: z.string().uuid().optional(),
  role: roleEnum.optional(),
  status: userStatusEnum.optional(),
  sortBy: sortByEnum.default("full_name"),
  sortOrder: sortOrderEnum.default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type UserFiltersInput = z.infer<typeof userFiltersSchema>;

export const toggleStatusSchema = z.object({
  status: userStatusEnum,
});

export type ToggleStatusInput = z.infer<typeof toggleStatusSchema>;
