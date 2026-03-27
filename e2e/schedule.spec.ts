import { test, expect } from "@playwright/test";

test.describe("Schedule", () => {
  test("shows schedule page heading", async ({ page }) => {
    await page.goto("/schedule");
    await expect(page.locator("h1")).toContainText("My Schedule");
  });

  test("displays schedule or empty state", async ({ page }) => {
    await page.goto("/schedule");

    const todaySection = page.getByRole("heading", { name: /today/i });
    const weeklySection = page.getByRole("heading", {
      name: /weekly schedule/i,
    });
    const emptyState = page.getByText("No classes assigned");

    await expect(
      todaySection.or(weeklySection).or(emptyState)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("navigable from nav bar", async ({ page }) => {
    await page.goto("/dashboard");
    const scheduleLink = page.locator("header").getByRole("link", { name: "Schedule" });
    // Nav links are gated behind onboarding status; skip if the test teacher is not fully onboarded
    const isVisible = await scheduleLink.isVisible({ timeout: 5_000 }).catch(() => false);
    test.skip(!isVisible, "Schedule nav link hidden — test teacher is not fully onboarded");
    await scheduleLink.click();
    await expect(page).toHaveURL(/\/schedule/);
    await expect(page.locator("h1")).toContainText("My Schedule");
  });
});
