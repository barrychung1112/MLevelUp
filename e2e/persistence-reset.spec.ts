import { expect, test } from "@playwright/test";

import { completeStandardOnboarding, expectOnboarding } from "./helpers";

test("fixed profile settings survive reload and reset returns to onboarding", async ({ page }) => {
  await completeStandardOnboarding(page);
  await page.goto("/profile");
  await expect(page.getByText("Machine Learning Engineer", { exact: true })).toBeVisible();
  await expect(page.getByText("5 hours every day", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("5 hours every day", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reset Training Data" }).click();
  await page.getByRole("dialog", { name: "Reset all training data?" }).getByRole("button", { name: "Confirm Reset" }).click();
  await expectOnboarding(page);
  await expect(page.getByRole("dialog", { name: "Challenger Warning" })).toBeVisible();
});
