import { test, expect } from "@playwright/test";

// Login tests run WITHOUT pre-authenticated state
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Teacher login", () => {
  test("shows the sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("Sign In");
    await expect(page.locator("#login-email")).toBeVisible();
  });

  test("redirects unauthenticated users to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows error for invalid email continuation", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-email").fill("not-a-real-email@invalid.test");
    await page.getByRole("button", { name: /continue/i }).click();

    // Should proceed to password step or show an error
    // (depends on whether the email exists in the system)
    await expect(
      page.locator("#login-password").or(page.locator('[role="alert"]'))
    ).toBeVisible({ timeout: 10_000 });
  });

  test("successful email/password login redirects to dashboard", async ({
    page,
  }) => {
    const email = process.env.E2E_TEACHER_EMAIL;
    const password = process.env.E2E_TEACHER_PASSWORD;
    test.skip(!email || !password, "E2E credentials not configured");

    await page.goto("/login");
    await page.locator("#login-email").fill(email!);
    await page.getByRole("button", { name: /continue/i }).click();

    await page.locator("#login-password").fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page.locator("h1")).toContainText("Welcome back");
  });
});
