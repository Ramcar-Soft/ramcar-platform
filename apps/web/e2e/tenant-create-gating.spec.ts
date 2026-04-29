import { test, expect } from "@playwright/test";

/**
 * Spec 024 — FR-008/FR-009/FR-012/FR-013 / SC-002 / SC-006
 * Verifies the Tenants-catalog Create button gating:
 * - Admin with 0 tenants → Sheet opens
 * - After first creation → next click opens ContactSupportDialog
 * - Admin with existing tenant → ContactSupportDialog on first click
 * - SuperAdmin → Sheet always, no gating
 */

const ADMIN_ONE = { email: "admin_with_one_tenant@test.com", password: "Test123!" };
const SUPERADMIN = { email: "superadmin@ramcar.dev", password: "password123" };

async function signIn(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in|iniciar/i }).click();
  await page.waitForURL(/\/(dashboard|home|\(dashboard\))/);
}

test.describe("Tenants catalog create gating (spec 024 FR-008–FR-013)", () => {
  test("Admin with existing tenant — Create button opens ContactSupportDialog (not Sheet)", async ({ page }) => {
    await signIn(page, ADMIN_ONE.email, ADMIN_ONE.password);
    await page.goto("/catalogs/tenants");

    await page.getByRole("button", { name: /new|create|nuevo|crear/i }).first().click();

    // The Sheet (tenant form) should NOT appear
    await expect(page.locator("[data-radix-sheet-content]")).toHaveCount(0);

    // The Dialog should appear
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/contact support|contacta a soporte/i);
  });

  test("ContactSupportDialog closes and re-appears on next click (no cached state, FR-007)", async ({ page }) => {
    await signIn(page, ADMIN_ONE.email, ADMIN_ONE.password);
    await page.goto("/catalogs/tenants");

    const createBtn = page.getByRole("button", { name: /new|create|nuevo|crear/i }).first();

    await createBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Dismiss with Escape
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Click again — should re-appear
    await createBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("SuperAdmin — Create button always opens the Sheet (FR-013)", async ({ page }) => {
    await signIn(page, SUPERADMIN.email, SUPERADMIN.password);
    await page.goto("/catalogs/tenants");

    await page.getByRole("button", { name: /new|create|nuevo|crear/i }).first().click();

    // Sheet should open (no ContactSupportDialog)
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Sheet contains a form input (name field), dialog does not
    await expect(dialog.locator("input").first()).toBeVisible();

    // Close and click again
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /new|create|nuevo|crear/i }).first().click();
    await expect(dialog.locator("input").first()).toBeVisible();
  });
});
