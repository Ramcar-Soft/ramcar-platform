import { describe, it, expect } from "vitest";
import { canModifyUser, getAssignableRoles, ROLE_HIERARCHY } from "./user";

describe("ROLE_HIERARCHY", () => {
  it("has correct ordering", () => {
    expect(ROLE_HIERARCHY.super_admin).toBeGreaterThan(ROLE_HIERARCHY.admin);
    expect(ROLE_HIERARCHY.admin).toBeGreaterThan(ROLE_HIERARCHY.guard);
    expect(ROLE_HIERARCHY.guard).toBeGreaterThan(ROLE_HIERARCHY.resident);
  });
});

describe("canModifyUser", () => {
  it("super_admin can modify anyone", () => {
    expect(canModifyUser("super_admin", "super_admin")).toBe(true);
    expect(canModifyUser("super_admin", "admin")).toBe(true);
    expect(canModifyUser("super_admin", "guard")).toBe(true);
    expect(canModifyUser("super_admin", "resident")).toBe(true);
  });

  it("admin can modify guard and resident", () => {
    expect(canModifyUser("admin", "guard")).toBe(true);
    expect(canModifyUser("admin", "resident")).toBe(true);
  });

  it("admin cannot modify super_admin", () => {
    expect(canModifyUser("admin", "super_admin")).toBe(false);
  });

  it("admin can modify admin (equal role)", () => {
    expect(canModifyUser("admin", "admin")).toBe(true);
  });

  it("guard cannot modify admin", () => {
    expect(canModifyUser("guard", "admin")).toBe(false);
  });

  it("resident cannot modify anyone except resident", () => {
    expect(canModifyUser("resident", "resident")).toBe(true);
    expect(canModifyUser("resident", "guard")).toBe(false);
    expect(canModifyUser("resident", "admin")).toBe(false);
    expect(canModifyUser("resident", "super_admin")).toBe(false);
  });
});

describe("getAssignableRoles", () => {
  it("super_admin can assign all roles", () => {
    expect(getAssignableRoles("super_admin")).toEqual([
      "super_admin",
      "admin",
      "guard",
      "resident",
    ]);
  });

  it("admin can assign guard and resident", () => {
    expect(getAssignableRoles("admin")).toEqual(["guard", "resident"]);
  });

  it("guard cannot assign any roles", () => {
    expect(getAssignableRoles("guard")).toEqual([]);
  });

  it("resident cannot assign any roles", () => {
    expect(getAssignableRoles("resident")).toEqual([]);
  });
});
