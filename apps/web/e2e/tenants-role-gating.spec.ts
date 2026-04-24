import { test, expect } from "@playwright/test";

const TENANTS_PATH = "/catalogs/tenants";
const DASHBOARD_PATH = "/dashboard";

/**
 * These tests require seeded accounts. Set via env vars or use the defaults
 * from supabase/seed.sql (guard@ramcar.mx / resident@ramcar.mx, password: Test1234!).
 */
const GUARD_EMAIL = process.env.E2E_GUARD_EMAIL ?? "guard@ramcar.mx";
const GUARD_PASSWORD = process.env.E2E_GUARD_PASSWORD ?? "Test1234!";
const RESIDENT_EMAIL = process.env.E2E_RESIDENT_EMAIL ?? "resident@ramcar.mx";
const RESIDENT_PASSWORD = process.env.E2E_RESIDENT_PASSWORD ?? "Test1234!";

async function loginAs(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/);
}

test.describe("Tenants catalog — role gating", () => {
  test("Guard: no Tenants nav entry and redirected from catalog route", async ({
    page,
  }) => {
    await loginAs(page, GUARD_EMAIL, GUARD_PASSWORD);

    // The sidebar must NOT contain a Tenants link
    await expect(
      page.getByRole("link", { name: /tenants/i }),
    ).not.toBeVisible();

    // Direct navigation must redirect to dashboard
    await page.goto(TENANTS_PATH);
    await expect(page).toHaveURL(new RegExp(DASHBOARD_PATH));
  });

  test("Resident: no Tenants nav entry and redirected from catalog route", async ({
    page,
  }) => {
    await loginAs(page, RESIDENT_EMAIL, RESIDENT_PASSWORD);

    await expect(
      page.getByRole("link", { name: /tenants/i }),
    ).not.toBeVisible();

    await page.goto(TENANTS_PATH);
    await expect(page).toHaveURL(new RegExp(DASHBOARD_PATH));
  });
});
