import { test, expect, type Page } from "@playwright/test";

/**
 * Resident vehicle permission E2E — requires a seeded local environment:
 *  - Guard user:  guard-a@example.com / password
 *  - Admin user:  admin-a@example.com / password
 *  - Tenant A with at least one resident who has ≥1 registered vehicle
 *  - Local API running on :3001, web on :3000
 *
 * Run: pnpm --filter @ramcar/web test:e2e -- residents-vehicle-permissions.spec.ts
 */

async function signIn(page: Page, email: string) {
  await page.goto("/en/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill("password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/en\//);
}

async function openFirstResidentSidebar(page: Page) {
  await page.goto("/en/residents");
  await page.getByRole("row").nth(1).click();
}

test.describe("Resident vehicle permissions", () => {
  test("guard sees no manage entry points on resident sidebar", async ({ page }) => {
    await signIn(page, "guard-a@example.com");
    await openFirstResidentSidebar(page);

    // Switch to Vehicle access mode to reveal vehicle section
    const vehicleButton = page.getByRole("button", { name: /vehicle/i }).first();
    if (await vehicleButton.isVisible()) {
      await vehicleButton.click();
    }

    // Guard should NOT see Add or Manage vehicle links
    await expect(page.getByRole("button", { name: /add vehicle/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /manage vehicle/i })).toHaveCount(0);
  });

  test("admin can edit a resident vehicle end-to-end", async ({ page }) => {
    await signIn(page, "admin-a@example.com");
    await openFirstResidentSidebar(page);

    // Click Manage Vehicles
    await page.getByRole("button", { name: /manage vehicle/i }).click();

    // Click Edit on first row
    await page.getByRole("button", { name: /edit/i }).first().click();

    // Update plate
    const plateInput = page.getByLabel(/plate/i);
    await plateInput.clear();
    await plateInput.fill("E2E-EDIT");
    await page.getByRole("button", { name: /update/i }).click();

    // Success toast
    await expect(page.getByText(/vehicle updated/i)).toBeVisible();

    // Returns to manage view — updated plate visible
    await expect(page.getByText("E2E-EDIT")).toBeVisible();
  });

  test("admin can delete a resident vehicle", async ({ page }) => {
    await signIn(page, "admin-a@example.com");
    await openFirstResidentSidebar(page);

    await page.getByRole("button", { name: /manage vehicle/i }).click();

    const rows = page.getByRole("listitem");
    const initialCount = await rows.count();

    // Click Delete on first row
    await page.getByRole("button", { name: /delete/i }).first().click();

    // Confirm deletion in AlertDialog
    await page.getByRole("button", { name: /^delete$/i }).click();

    // Success toast
    await expect(page.getByText(/vehicle deleted/i)).toBeVisible();

    // One fewer row
    await expect(rows).toHaveCount(initialCount - 1);
  });
});
