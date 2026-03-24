import { test, expect } from "@playwright/test";

test.describe("Classes", () => {
  test("shows classes page heading", async ({ page }) => {
    await page.goto("/dashboard/classes");
    await expect(page.locator("h1")).toContainText("My Classes");
  });

  test("displays assigned classes or empty state", async ({ page }) => {
    await page.goto("/dashboard/classes");

    const classCard = page.locator(
      'a[href^="/dashboard/classes/"][href$="/attendance"]'
    );
    const emptyState = page.getByText("No classes assigned");

    await expect(classCard.first().or(emptyState)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("can navigate to attendance page (if classes assigned)", async ({
    page,
  }) => {
    await page.goto("/dashboard/classes");

    const firstClass = page
      .locator('a[href^="/dashboard/classes/"][href$="/attendance"]')
      .first();
    const hasClasses = await firstClass.isVisible().catch(() => false);

    test.skip(!hasClasses, "No classes assigned to test teacher");

    await firstClass.click();
    await expect(page).toHaveURL(/\/dashboard\/classes\/.*\/attendance/);
  });
});
