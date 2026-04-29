import { describe, it, expect } from "vitest";
import { canShowTenantSelector } from "./can-show-tenant-selector";
import { canCreateAnotherTenant } from "./can-create-another-tenant";
import { canEditUserTenantField } from "./can-edit-user-tenant-field";

// ─────────────────────────────────────────────────────────────────────────────
// canShowTenantSelector
// ─────────────────────────────────────────────────────────────────────────────

describe("canShowTenantSelector", () => {
  it("returns true for SuperAdmin", () => {
    expect(canShowTenantSelector("SuperAdmin")).toBe(true);
  });

  it("returns false for Admin", () => {
    expect(canShowTenantSelector("Admin")).toBe(false);
  });

  it("returns false for Guard", () => {
    expect(canShowTenantSelector("Guard")).toBe(false);
  });

  it("returns false for Resident", () => {
    expect(canShowTenantSelector("Resident")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// canCreateAnotherTenant
// ─────────────────────────────────────────────────────────────────────────────

describe("canCreateAnotherTenant", () => {
  it.each([0, 1, 2, 50])("SuperAdmin can always create (count=%i)", (count) => {
    expect(canCreateAnotherTenant("SuperAdmin", count)).toBe(true);
  });

  it("Admin with 0 tenants can create", () => {
    expect(canCreateAnotherTenant("Admin", 0)).toBe(true);
  });

  it("Admin with 1 tenant cannot create", () => {
    expect(canCreateAnotherTenant("Admin", 1)).toBe(false);
  });

  it("Admin with 2 tenants cannot create", () => {
    expect(canCreateAnotherTenant("Admin", 2)).toBe(false);
  });

  it.each([0, 1, 50])("Guard can never create (count=%i)", (count) => {
    expect(canCreateAnotherTenant("Guard", count)).toBe(false);
  });

  it.each([0, 1, 50])("Resident can never create (count=%i)", (count) => {
    expect(canCreateAnotherTenant("Resident", count)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// canEditUserTenantField
// ─────────────────────────────────────────────────────────────────────────────

describe("canEditUserTenantField", () => {
  it("returns true for SuperAdmin (can pick freely)", () => {
    expect(canEditUserTenantField("SuperAdmin")).toBe(true);
  });

  it("returns false for Admin (field is locked to their current tenant)", () => {
    expect(canEditUserTenantField("Admin")).toBe(false);
  });

  it("returns false for Guard", () => {
    expect(canEditUserTenantField("Guard")).toBe(false);
  });

  it("returns false for Resident", () => {
    expect(canEditUserTenantField("Resident")).toBe(false);
  });
});
