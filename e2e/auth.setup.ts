import { test as setup, expect } from "@playwright/test";

/**
 * Authenticates a test teacher and saves the browser storage state
 * so all subsequent tests run as an authenticated user.
 *
 * Requires env vars:
 *   E2E_TEACHER_EMAIL    — test teacher's email
 *   E2E_TEACHER_PASSWORD — test teacher's password
 */
setup("authenticate teacher", async ({ page }) => {
  const email = process.env.E2E_TEACHER_EMAIL;
  const password = process.env.E2E_TEACHER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "E2E_TEACHER_EMAIL and E2E_TEACHER_PASSWORD must be set to run E2E tests"
    );
  }

  await page.goto("/login");

  // Step 1: Enter email
  await page.getByLabel(/email/i).fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  // Step 2: Enter password (email/password auth path)
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  // Persist auth state
  await page.context().storageState({ path: "e2e/.auth/teacher.json" });
});
