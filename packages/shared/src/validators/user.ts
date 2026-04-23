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

const usernameWhenProvided = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(50)
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Username can only contain letters, numbers, and underscores",
  );

const baseCreateUserObj = z.object({
  fullName: z.string().min(1, "Full name is required").max(255),
  email: z.string().email("Invalid email address"),
  address: z.string().max(500).optional().or(z.literal("")),
  username: z.union([z.literal(""), usernameWhenProvided]).optional(),
  phone: z.string().max(20).optional().or(z.literal("")),
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
  address: z.string().min(1, "Address is required").max(500),
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

const updateUserObj = z.object({
  fullName: z.string().min(1, "Full name is required").max(255).optional(),
  email: z.string().email("Invalid email address").optional(),
  address: z.string().max(500).optional().or(z.literal("")),
  username: z.union([z.literal(""), usernameWhenProvided]).optional(),
  phone: z.string().max(20).optional().or(z.literal("")),
  phoneType: phoneTypeEnum.optional().nullable(),
  userGroupIds: z.array(z.string().uuid()).optional(),
  observations: z.string().max(1000).optional().nullable(),
  role: roleEnum.optional(),
  tenantId: z.string().uuid().optional(),
  tenant_ids: tenantIdsArray.optional(),
  primary_tenant_id: z.string().uuid().optional(),
});

export const updateUserSchema = updateUserObj.superRefine((data, ctx) => {
  if (data.role === "resident" && data.address !== undefined && data.address.trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.too_small,
      minimum: 1,
      type: "string",
      inclusive: true,
      message: "Address is required",
      path: ["address"],
    });
  }

  if (
    (data.role === "admin" || data.role === "guard") &&
    data.tenant_ids !== undefined &&
    data.primary_tenant_id !== undefined &&
    !data.tenant_ids.includes(data.primary_tenant_id)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "users.validation.primaryMustBeSelected",
      path: ["primary_tenant_id"],
    });
  }
});

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
