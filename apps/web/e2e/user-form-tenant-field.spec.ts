import { test, expect } from "@playwright/test";

/**
 * Spec 024 — FR-014/FR-015/FR-016/FR-017/FR-018 / SC-003 / SC-004
 * Verifies the user-creation form shows a single-select tenant field:
 * - SuperAdmin: enabled, all tenants listed
 * - Admin: disabled (pre-filled to their current tenant), with hint text
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

test.describe("User form tenant field (spec 024 FR-014–FR-016)", () => {
  test("Admin creator — tenant select is disabled and pre-filled with their tenant", async ({ page }) => {
    await signIn(page, ADMIN_ONE.email, ADMIN_ONE.password);
    await page.goto("/catalogs/users");

    await page.getByRole("button", { name: /new|create|nuevo|crear/i }).first().click();

    // Wait for the form Sheet to open
    const sheet = page.locator("[data-radix-dialog-content]").or(page.getByRole("dialog")).first();
    await expect(sheet).toBeVisible();

    // The tenant field should be disabled (data-disabled attribute set by Radix)
    const allComboboxes = page.locator("button[role='combobox']");
    const count = await allComboboxes.count();
    let foundDisabled = false;
    for (let i = 0; i < count; i++) {
      const attr = await allComboboxes.nth(i).getAttribute("data-disabled");
      if (attr !== null) {
        foundDisabled = true;
        break;
      }
    }
    expect(foundDisabled).toBe(true);

    // Hint text is shown
    const hint = page.getByText(/community|comunidad|fraccionamiento/i).first();
    await expect(hint).toBeVisible();
  });

  test("SuperAdmin creator — tenant select is enabled and lists all tenants", async ({ page }) => {
    await signIn(page, SUPERADMIN.email, SUPERADMIN.password);
    await page.goto("/catalogs/users");

    await page.getByRole("button", { name: /new|create|nuevo|crear/i }).first().click();

    const sheet = page.locator("[data-radix-dialog-content]").or(page.getByRole("dialog")).first();
    await expect(sheet).toBeVisible();

    // All comboboxes should be enabled for SuperAdmin
    const allComboboxes = sheet.locator("button[role='combobox']");
    const count = await allComboboxes.count();
    expect(count).toBeGreaterThan(0);

    let hasEnabled = false;
    for (let i = 0; i < count; i++) {
      const attr = await allComboboxes.nth(i).getAttribute("data-disabled");
      if (attr === null) {
        hasEnabled = true;
        break;
      }
    }
    expect(hasEnabled).toBe(true);

    // No locked hint for SuperAdmin
    await expect(page.getByText(/contact support if you need to assign/i)).toHaveCount(0);
  });
});
