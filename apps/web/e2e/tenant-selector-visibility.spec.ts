import { test, expect } from "@playwright/test";

/**
 * Spec 024 — FR-001 / FR-002 / SC-001
 * Verifies the tenant selector is visible only for SuperAdmin and hidden (static
 * span) for Admin and Guard roles, regardless of how many tenant_ids the JWT carries.
 */

const ADMIN_WITH_ONE = {
  email: "admin_with_one_tenant@test.com",
  password: "Test123!",
};

const SUPERADMIN = {
  email: "superadmin@ramcar.dev",
  password: "password123",
};

async function signIn(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in|iniciar/i }).click();
  await page.waitForURL(/\/(dashboard|home|\(dashboard\))/);
}

test.describe("Tenant selector visibility (spec 024 FR-001/FR-002)", () => {
  test("Admin sees no combobox in the top bar", async ({ page }) => {
    await signIn(page, ADMIN_WITH_ONE.email, ADMIN_WITH_ONE.password);

    // No combobox trigger in the header
    const combobox = page.locator("header [role='combobox']");
    await expect(combobox).toHaveCount(0);

    // The tenant name is shown as static text
    await expect(page.locator("header span.truncate").first()).not.toBeEmpty();
  });

  test("Admin sees no combobox after navigating between modules", async ({ page }) => {
    await signIn(page, ADMIN_WITH_ONE.email, ADMIN_WITH_ONE.password);

    const routes = ["/catalogs/users", "/catalogs/residents", "/access-log", "/catalogs/tenants"];
    for (const route of routes) {
      await page.goto(route);
      const combobox = page.locator("header [role='combobox']");
      await expect(combobox).toHaveCount(0);
    }
  });

  test("SuperAdmin sees a clickable combobox in the top bar", async ({ page }) => {
    await signIn(page, SUPERADMIN.email, SUPERADMIN.password);

    const combobox = page.locator("header [role='combobox']");
    await expect(combobox).toHaveCount(1);
  });

  test("SuperAdmin combobox opens and lists tenants", async ({ page }) => {
    await signIn(page, SUPERADMIN.email, SUPERADMIN.password);

    await page.locator("header [role='combobox']").click();
    // At least one item rendered in the popover command list
    await expect(page.locator("[cmdk-item]").first()).toBeVisible();
  });
});
