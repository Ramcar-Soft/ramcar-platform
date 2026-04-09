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

export const createUserSchema = z
  .object({
    fullName: z.string().min(1, "Full name is required").max(255),
    email: z.string().email("Invalid email address"),
    role: roleEnum,
    tenantId: z.string().uuid("Invalid tenant ID"),
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
  })
  .refine(
    (data) => {
      if (data.password && data.password.length > 0) {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    },
  );

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(255),
  email: z.string().email("Invalid email address"),
  role: roleEnum,
  tenantId: z.string().uuid("Invalid tenant ID"),
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
  phoneType: phoneTypeEnum.optional().nullable(),
  userGroupIds: z.array(z.string().uuid()).optional(),
  observations: z.string().max(1000).optional().nullable(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const userFiltersSchema = z.object({
  search: z.string().optional(),
  tenantId: z.string().uuid().optional(),
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
