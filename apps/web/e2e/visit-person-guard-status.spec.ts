import { test, expect, type Page } from "@playwright/test";

/**
 * Visit-person guard status E2E — requires a seeded local environment:
 *  - Guard user:  guard-a@example.com / password
 *  - Admin user:  admin-a@example.com / password
 *  - Tenant A with at least one resident
 *  - Local API running on :3001, web on :3000
 *
 * Run: pnpm --filter @ramcar/web test:e2e -- visit-person-guard-status.spec.ts
 */

async function signIn(page: Page, email: string) {
  await page.goto("/en/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill("password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/en\//);
}

async function openRegisterVisitorSidebar(page: Page) {
  await page.goto("/en/visitors");
  await page.getByRole("button", { name: /register new/i }).click();
}

test.describe("Visit-person status — guard read-only", () => {
  test("guard sees status select disabled and submitted record persists as flagged", async ({ page }) => {
    await signIn(page, "guard-a@example.com");
    await openRegisterVisitorSidebar(page);

    // The status combobox is rendered but disabled
    const statusCombobox = page.getByRole("combobox").first();
    await expect(statusCombobox).toBeDisabled();

    // Fill name, submit
    const fullName = `E2E Guard ${Date.now()}`;
    await page.getByPlaceholder(/full name/i).fill(fullName);
    await page.getByRole("button", { name: /^save$/i }).click();

    // Success toast
    await expect(page.getByText(/visitor registered successfully/i)).toBeVisible();

    // Find the new row in the table and verify the status column shows "Flagged"
    const row = page.getByRole("row", { name: new RegExp(fullName) });
    await expect(row).toContainText(/flagged/i);
  });

  test("admin can register a visitor and choose status='allowed'", async ({ page }) => {
    await signIn(page, "admin-a@example.com");
    await openRegisterVisitorSidebar(page);

    const statusCombobox = page.getByRole("combobox").first();
    await expect(statusCombobox).not.toBeDisabled();

    // Open dropdown and pick "Allowed"
    await statusCombobox.click();
    await page.getByRole("option", { name: /allowed/i }).click();

    const fullName = `E2E Admin ${Date.now()}`;
    await page.getByPlaceholder(/full name/i).fill(fullName);
    await page.getByRole("button", { name: /^save$/i }).click();

    await expect(page.getByText(/visitor registered successfully/i)).toBeVisible();

    const row = page.getByRole("row", { name: new RegExp(fullName) });
    await expect(row).toContainText(/allowed/i);
  });
});
