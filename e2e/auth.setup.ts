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

  // Intercept check-email API to capture the response for diagnostics
  let checkEmailResponse: { status: number; body: string } | null = null;
  page.on("response", async (response) => {
    if (response.url().includes("/api/auth/check-email")) {
      checkEmailResponse = {
        status: response.status(),
        body: await response.text().catch(() => "failed to read body"),
      };
    }
  });

  await page.goto("/login");

  // Step 1: Enter email
  await page.getByLabel(/email/i).fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  // Step 2: Wait for password step to appear (check-email API must resolve first)
  const passwordField = page.getByLabel(/password/i);

  try {
    await passwordField.waitFor({ state: "visible", timeout: 15_000 });
  } catch {
    // Password field didn't appear — capture diagnostics
    const currentUrl = page.url();
    const bodyText = await page.locator("body").innerText().catch(() => "failed");
    throw new Error(
      [
        "Password field never appeared after clicking Continue.",
        `URL: ${currentUrl}`,
        `check-email response: ${JSON.stringify(checkEmailResponse)}`,
        `Page text (first 500 chars): ${bodyText.substring(0, 500)}`,
      ].join("\n")
    );
  }

  await passwordField.fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  // Persist auth state
  await page.context().storageState({ path: "e2e/.auth/teacher.json" });
});
