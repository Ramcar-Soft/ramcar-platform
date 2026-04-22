import { test, expect } from "@playwright/test";

/**
 * Logbook E2E golden path — requires a seeded local environment:
 *  - Admin user: admin-a@example.com / password
 *  - Tenant A with ≥25 visitor access events today
 *  - Local API running on :3001, web on :3000
 *
 * Run: pnpm --filter @ramcar/web test:e2e -- logbook.spec.ts
 */
test.describe("Logbook — Admin golden path", () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as Admin. Adjust credentials to match your local seed.
    await page.goto("/en/login");
    await page.getByLabel(/email/i).fill("admin-a@example.com");
    await page.getByLabel(/password/i).fill("password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/en\/logbook/);
  });

  test("navigates to /logbook/visitors and shows today's rows", async ({ page }) => {
    await expect(page).toHaveURL(/\/logbook\/visitors/);
    // Tab nav visible
    await expect(page.getByRole("tab", { name: /visitors/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /providers/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /residents/i })).toBeVisible();
    // Table has rows (at least 1)
    const rows = page.getByRole("row");
    await expect(rows.nth(1)).toBeVisible(); // first data row after header
  });

  test("switches to Providers tab and preserves date filter", async ({ page }) => {
    // Apply last_7d filter first
    await page.getByRole("button", { name: /date range|today/i }).click();
    await page.getByText(/last 7 days/i).click();
    await expect(page).toHaveURL(/date_preset=last_7d/);

    // Switch tab
    await page.getByRole("tab", { name: /providers/i }).click();
    await expect(page).toHaveURL(/\/logbook\/providers/);
    await expect(page).toHaveURL(/date_preset=last_7d/);
  });

  test("search filters the table", async ({ page }) => {
    const searchInput = page.getByRole("searchbox").or(
      page.getByPlaceholder(/search/i),
    );
    await searchInput.fill("abc");
    // After 300 ms debounce, URL gains search param
    await page.waitForURL(/search=abc/, { timeout: 2000 });
    // Clearing restores
    await searchInput.fill("");
    await page.waitForURL((url) => !url.search.includes("search="), { timeout: 2000 });
  });

  test("Export current view triggers a download", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /export/i }).click();
    await page.getByRole("menuitem", { name: /export current view/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^logbook-visitors-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
