import { describe, it, expect } from "vitest";
import {
  createUserSchema,
  updateUserSchema,
  userFiltersSchema,
  toggleStatusSchema,
} from "./user";

describe("createUserSchema", () => {
  const tenantUuid = "a0000000-0000-0000-0000-000000000001";
  const validInput = {
    fullName: "John Doe",
    email: "john@example.com",
    role: "guard",
    tenant_ids: [tenantUuid],
    primary_tenant_id: tenantUuid,
    address: "123 Main St",
    username: "johndoe",
    phone: "+1234567890",
    userGroupIds: [],
  };

  it("accepts valid input", () => {
    const result = createUserSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts all optional fields", () => {
    const result = createUserSchema.safeParse({
      ...validInput,
      password: "securepass",
      confirmPassword: "securepass",
      phoneType: "cellphone",
      userGroupIds: ["a0000000-0000-0000-0000-000000000001"],
      observations: "Some note",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty fullName", () => {
    const result = createUserSchema.safeParse({ ...validInput, fullName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = createUserSchema.safeParse({
      ...validInput,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = createUserSchema.safeParse({
      ...validInput,
      role: "manager",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid tenantId (not uuid)", () => {
    const result = createUserSchema.safeParse({
      ...validInput,
      role: "resident",
      tenantId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects username shorter than 3 chars", () => {
    const result = createUserSchema.safeParse({
      ...validInput,
      username: "ab",
    });
    expect(result.success).toBe(false);
  });

  it("rejects username with special characters", () => {
    const result = createUserSchema.safeParse({
      ...validInput,
      username: "john@doe",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty phone and username for any role (optional)", () => {
    expect(
      createUserSchema.safeParse({ ...validInput, phone: "", username: "" })
        .success,
    ).toBe(true);
  });

  it("accepts empty address for non-resident roles", () => {
    const result = createUserSchema.safeParse({
      ...validInput,
      role: "guard",
      address: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty address for resident role", () => {
    const result = createUserSchema.safeParse({
      ...validInput,
      role: "resident",
      tenantId: "a0000000-0000-0000-0000-000000000001",
      address: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty string for optional fields", () => {
    const result = createUserSchema.safeParse({
      ...validInput,
      password: "",
      confirmPassword: "",
      observations: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects passwords that do not match", () => {
    const result = createUserSchema.safeParse({
      ...validInput,
      password: "securepass",
      confirmPassword: "differentpass",
    });
    expect(result.success).toBe(false);
  });

  it("accepts matching passwords", () => {
    const result = createUserSchema.safeParse({
      ...validInput,
      password: "securepass",
      confirmPassword: "securepass",
    });
    expect(result.success).toBe(true);
  });

  it("rejects fullName over 255 chars", () => {
    const result = createUserSchema.safeParse({
      ...validInput,
      fullName: "a".repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid roles", () => {
    const perRole: Record<string, Record<string, unknown>> = {
      super_admin: {},
      admin: { tenant_ids: [tenantUuid], primary_tenant_id: tenantUuid },
      guard: { tenant_ids: [tenantUuid], primary_tenant_id: tenantUuid },
      resident: { tenantId: tenantUuid },
    };
    for (const [role, extras] of Object.entries(perRole)) {
      const result = createUserSchema.safeParse({
        ...validInput,
        role,
        ...extras,
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts all valid phone types", () => {
    for (const phoneType of ["house", "cellphone", "work", "primary"]) {
      const result = createUserSchema.safeParse({ ...validInput, phoneType });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid phone type", () => {
    const result = createUserSchema.safeParse({
      ...validInput,
      phoneType: "fax",
    });
    expect(result.success).toBe(false);
  });

  it("defaults userGroupIds to empty array", () => {
    const { userGroupIds, ...withoutGroups } = validInput;
    console.log('Users with groups', userGroupIds);
    const result = createUserSchema.safeParse(withoutGroups);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userGroupIds).toEqual([]);
    }
  });
});

describe("updateUserSchema", () => {
  const validUpdate = {
    fullName: "Jane Doe",
    email: "jane@example.com",
    role: "guard" as const,
    tenantId: "a0000000-0000-0000-0000-000000000001",
    address: "456 Oak Ave",
    username: "janedoe",
    phone: "+9876543210",
  };

  it("accepts valid full update", () => {
    const result = updateUserSchema.safeParse(validUpdate);
    expect(result.success).toBe(true);
  });

  it("accepts empty update (all fields optional)", () => {
    expect(updateUserSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with a single field", () => {
    expect(
      updateUserSchema.safeParse({ fullName: "Jane Doe" }).success,
    ).toBe(true);
  });

  it("accepts update without role (role is optional on update)", () => {
    const { role: _role, ...withoutRole } = validUpdate;
    console.log(`[Info]: Skip role field`, _role);
    expect(updateUserSchema.safeParse(withoutRole).success).toBe(true);
  });

  it("accepts empty address when role is not sent", () => {
    const { role: _role, ...withoutRole } = validUpdate;
    console.log(`[Info]: Skip role field`, _role);
    expect(
      updateUserSchema.safeParse({ ...withoutRole, address: "" }).success,
    ).toBe(true);
  });

  it("accepts empty address when role is admin", () => {
    expect(
      updateUserSchema.safeParse({ ...validUpdate, role: "admin", address: "" })
        .success,
    ).toBe(true);
  });

  it("rejects empty address when role is resident", () => {
    expect(
      updateUserSchema.safeParse({
        ...validUpdate,
        role: "resident",
        address: "",
      }).success,
    ).toBe(false);
  });

  it("rejects admin/guard when primary_tenant_id is not in tenant_ids", () => {
    const a = "a0000000-0000-0000-0000-000000000001";
    const b = "a0000000-0000-0000-0000-000000000002";
    expect(
      updateUserSchema.safeParse({
        role: "admin",
        tenant_ids: [a],
        primary_tenant_id: b,
      }).success,
    ).toBe(false);
  });

  it("accepts null for nullable fields", () => {
    const result = updateUserSchema.safeParse({
      ...validUpdate,
      phoneType: null,
      observations: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email when provided", () => {
    const result = updateUserSchema.safeParse({ ...validUpdate, email: "bad" });
    expect(result.success).toBe(false);
  });
});

describe("userFiltersSchema", () => {
  it("applies defaults for missing fields", () => {
    const result = userFiltersSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortBy).toBe("full_name");
      expect(result.data.sortOrder).toBe("asc");
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it("coerces string page to number", () => {
    const result = userFiltersSchema.safeParse({ page: "3" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
    }
  });

  it("rejects page less than 1", () => {
    const result = userFiltersSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects pageSize over 100", () => {
    const result = userFiltersSchema.safeParse({ pageSize: 101 });
    expect(result.success).toBe(false);
  });

  it("accepts valid status filter", () => {
    const result = userFiltersSchema.safeParse({ status: "active" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = userFiltersSchema.safeParse({ status: "deleted" });
    expect(result.success).toBe(false);
  });

  it("accepts valid sortBy values", () => {
    for (const sortBy of ["full_name", "email", "role", "status", "created_at"]) {
      const result = userFiltersSchema.safeParse({ sortBy });
      expect(result.success).toBe(true);
    }
  });
});

describe("toggleStatusSchema", () => {
  it("accepts active", () => {
    const result = toggleStatusSchema.safeParse({ status: "active" });
    expect(result.success).toBe(true);
  });

  it("accepts inactive", () => {
    const result = toggleStatusSchema.safeParse({ status: "inactive" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = toggleStatusSchema.safeParse({ status: "banned" });
    expect(result.success).toBe(false);
  });

  it("rejects missing status", () => {
    const result = toggleStatusSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
