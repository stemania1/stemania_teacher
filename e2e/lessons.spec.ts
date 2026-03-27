import { test, expect } from "@playwright/test";

test.describe("Lessons", () => {
  test("shows lessons page heading", async ({ page }) => {
    await page.goto("/lessons");
    await expect(page.locator("h1")).toContainText("My Lessons");
  });

  test("displays assigned lessons or empty state", async ({ page }) => {
    await page.goto("/lessons");

    // Either lesson cards are shown or the empty state
    const lessonCard = page.locator('a[href^="/lessons/"]');
    const emptyState = page.getByText("No lessons assigned yet");

    await expect(lessonCard.first().or(emptyState)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("can navigate to a lesson (if assigned)", async ({ page }) => {
    await page.goto("/lessons");

    const firstLesson = page.locator('a[href^="/lessons/"]').first();
    const hasLessons = await firstLesson.isVisible().catch(() => false);

    test.skip(!hasLessons, "No lessons assigned to test teacher");

    await firstLesson.click();
    await expect(page).toHaveURL(/\/lessons\/[a-z0-9-]+/);
  });

  test("navigable from nav bar", async ({ page }) => {
    await page.goto("/dashboard");
    const lessonsLink = page.locator("header").getByRole("link", { name: "My Lessons" });
    // Nav links are gated behind onboarding status; skip if the test teacher is not fully onboarded
    const isVisible = await lessonsLink.isVisible({ timeout: 5_000 }).catch(() => false);
    test.skip(!isVisible, "My Lessons nav link hidden — test teacher is not fully onboarded");
    await lessonsLink.click();
    await expect(page).toHaveURL(/\/lessons/);
    await expect(page.locator("h1")).toContainText("My Lessons");
  });
});
