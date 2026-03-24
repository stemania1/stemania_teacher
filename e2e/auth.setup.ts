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

  // Step 2: Wait for password step to appear (check-email API must resolve first)
  const passwordField = page.getByLabel(/password/i);

  try {
    await passwordField.waitFor({ state: "visible", timeout: 15_000 });
  } catch {
    // Password field didn't appear — capture page state for diagnostics
    const errorAlert = page.getByRole("alert");
    const hasError = await errorAlert.isVisible().catch(() => false);
    let errorText = "";
    if (hasError) {
      // Wait briefly for React to render the error text
      await page.waitForTimeout(500);
      errorText = (await errorAlert.textContent()) ?? "";
    }
    const bodyText = await page.locator("body").innerText();
    throw new Error(
      `Password field never appeared after clicking Continue.\n` +
      `Error alert visible: ${hasError}\n` +
      `Error text: "${errorText}"\n` +
      `Page text: "${bodyText.substring(0, 500)}"\n` +
      `Ensure E2E_TEACHER_EMAIL exists in the users table and uses email/password auth.`
    );
  }

  await passwordField.fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  // Persist auth state
  await page.context().storageState({ path: "e2e/.auth/teacher.json" });
});
