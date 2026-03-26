import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("shows welcome heading", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("h1")).toContainText("Welcome back");
  });

  test("shows onboarding checklist for non-onboarded teacher", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Getting Started")).toBeVisible();
  });

  test("hides quick access cards for non-onboarded teacher", async ({ page }) => {
    await page.goto("/dashboard");
    // Wait for the page to load
    await expect(page.locator("h1")).toContainText("Welcome back");
    // Quick Access should not be visible for non-onboarded teachers
    await expect(page.getByText("Quick Access")).not.toBeVisible();
  });

  test("navigation shows only Dashboard for non-onboarded teacher", async ({ page }) => {
    await page.goto("/dashboard");

    const nav = page.locator("header");
    await expect(nav.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();

    // Wait for onboarding status to load, then verify restricted nav items are hidden
    // Give time for the client-side fetch to complete
    await page.waitForTimeout(2000);
    await expect(nav.getByRole("link", { name: "My Lessons" })).not.toBeVisible();
    await expect(nav.getByRole("link", { name: "My Classes" })).not.toBeVisible();
    await expect(nav.getByRole("link", { name: "Schedule" })).not.toBeVisible();
  });

  test("user menu opens and shows profile options", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByLabel("Open user menu").click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(
      menu.getByRole("menuitem", { name: /my information/i })
    ).toBeVisible();
    await expect(
      menu.getByRole("menuitem", { name: /sign out/i })
    ).toBeVisible();
  });
});
