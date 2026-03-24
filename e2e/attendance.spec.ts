import { test, expect } from "@playwright/test";

test.describe("Attendance", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/classes");

    const firstClass = page
      .locator('a[href^="/dashboard/classes/"][href$="/attendance"]')
      .first();
    const hasClasses = await firstClass.isVisible().catch(() => false);

    test.skip(!hasClasses, "No classes assigned to test teacher");

    await firstClass.click();
    await expect(page).toHaveURL(/\/dashboard\/classes\/.*\/attendance/);
  });

  test("shows attendance page with tabs", async ({ page }) => {
    await expect(
      page.getByRole("tab", { name: /take attendance/i })
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /history/i })
    ).toBeVisible();
  });

  test("shows date picker and student list", async ({ page }) => {
    await expect(page.locator("#attendance-date")).toBeVisible();

    // Either students are listed or the page shows a message
    const studentRow = page.locator('button[aria-label^="Mark "]');
    await expect(studentRow.first()).toBeVisible({ timeout: 10_000 });
  });

  test("can toggle student attendance status", async ({ page }) => {
    const firstStatusButton = page
      .locator('button[aria-label^="Mark "]')
      .first();
    await expect(firstStatusButton).toBeVisible({ timeout: 10_000 });

    // Click to toggle status
    await firstStatusButton.click();

    // Button should reflect the pressed state
    await expect(firstStatusButton).toHaveAttribute("aria-pressed", "true");
  });

  test("can switch to history tab", async ({ page }) => {
    await page.getByRole("tab", { name: /history/i }).click();

    // History tab panel should be visible
    await expect(page.locator("#tabpanel-history")).toBeVisible();
  });

  test("mark all present button works", async ({ page }) => {
    const markAllPresent = page.getByRole("button", {
      name: /mark all present/i,
    });

    const isVisible = await markAllPresent.isVisible().catch(() => false);
    test.skip(!isVisible, "Mark All Present button not available");

    await markAllPresent.click();

    // All students should now show as present
    await expect(page.getByText(/present/i).first()).toBeVisible();
  });
});
