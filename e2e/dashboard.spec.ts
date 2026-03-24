import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("shows welcome heading and quick access cards", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("h1")).toContainText("Welcome back");
    await expect(page.locator("h2")).toContainText("Quick Access");

    // Quick access cards
    await expect(
      page.getByRole("link", { name: /my lessons/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /my classes/i })
    ).toBeVisible();
  });

  test("navigation links are present", async ({ page }) => {
    await page.goto("/dashboard");

    const nav = page.locator("header");
    await expect(nav.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "My Lessons" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "My Classes" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Schedule" })).toBeVisible();
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

  test("quick access card navigates to lessons", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("heading", { name: "My Lessons" }).click();
    await expect(page).toHaveURL(/\/lessons/);
  });

  test("quick access card navigates to classes", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("heading", { name: "My Classes" }).click();
    await expect(page).toHaveURL(/\/dashboard\/classes/);
  });
});
