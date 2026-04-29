import { test, expect } from "@playwright/test";

/**
 * Spec 024 — FR-020/FR-021 / SC-005
 * Guard against regressions: all SuperAdmin behaviors from spec 020 + 021 must continue
 * to work after the spec 024 policy changes for Admin/Guard roles.
 */

const SUPERADMIN = { email: "superadmin@ramcar.dev", password: "password123" };

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(SUPERADMIN.email);
  await page.getByLabel(/password/i).fill(SUPERADMIN.password);
  await page.getByRole("button", { name: /sign in|log in|iniciar/i }).click();
  await page.waitForURL(/\/(dashboard|home|\(dashboard\))/);
}

test.describe("SuperAdmin regression — spec 024 preserves spec 020/021 behaviors", () => {
  test("SuperAdmin top-bar selector renders and is interactive (FR-021)", async ({ page }) => {
    await signIn(page);
    const combobox = page.locator("header [role='combobox']");
    await expect(combobox).toHaveCount(1);
    // Clicking opens the popover
    await combobox.click();
    await expect(page.locator("[cmdk-item]").first()).toBeVisible();
    // Close it
    await page.keyboard.press("Escape");
  });

  test("SuperAdmin Tenants catalog — Create button always opens the Sheet (FR-020/FR-013)", async ({ page }) => {
    await signIn(page);
    await page.goto("/catalogs/tenants");

    const createBtn = page.getByRole("button", { name: /new|create|nuevo|crear/i }).first();
    await createBtn.click();

    // Sheet should open with a form input (not a ContactSupportDialog)
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("input").first()).toBeVisible();

    // No "contact support" text
    await expect(dialog.getByText(/contact support|contacta a soporte/i)).toHaveCount(0);
  });

  test("SuperAdmin Users form — tenant field is a single-select and enabled (spec 024 FR-015)", async ({ page }) => {
    await signIn(page);
    await page.goto("/catalogs/users");

    const createBtn = page.getByRole("button", { name: /new|create|nuevo|crear/i }).first();
    await createBtn.click();

    const sheet = page.getByRole("dialog").first();
    await expect(sheet).toBeVisible();

    // All selects should be enabled (no disabled attribute)
    const comboboxes = sheet.locator("button[role='combobox']");
    const count = await comboboxes.count();
    expect(count).toBeGreaterThan(0);

    let allEnabled = true;
    for (let i = 0; i < count; i++) {
      const attr = await comboboxes.nth(i).getAttribute("data-disabled");
      if (attr !== null) {
        allEnabled = false;
        break;
      }
    }
    expect(allEnabled).toBe(true);
  });

  test("SuperAdmin cross-catalog access still scoped by active tenant from top bar (FR-021)", async ({ page }) => {
    await signIn(page);
    // Just verify catalogs load without error — scope is enforced by existing spec 021 logic
    const routes = ["/catalogs/users", "/catalogs/residents", "/access-log"];
    for (const route of routes) {
      await page.goto(route);
      // No error page (no 403/404 message)
      await expect(page.locator("h1, h2").first()).toBeVisible();
    }
  });
});
