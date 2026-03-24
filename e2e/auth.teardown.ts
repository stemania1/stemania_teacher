import { test as teardown } from "@playwright/test";
import fs from "node:fs";

teardown("clean up auth state", async () => {
  const authFile = "e2e/.auth/teacher.json";
  if (fs.existsSync(authFile)) {
    fs.unlinkSync(authFile);
  }
});
