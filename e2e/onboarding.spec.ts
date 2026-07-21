import { expect, test } from "@playwright/test";

import { expectOnboarding } from "./helpers";

test("a fresh visitor accepts the oath and receives the courage challenge", async ({ page }) => {
  await page.goto("/");
  await expectOnboarding(page);
  await expect(page.getByRole("dialog", { name: "Challenger Warning" })).toBeVisible();
  await expect(page.getByText("This is a road for those who choose to become stronger.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Accept the Challenge" }).click();
  await expect(page.getByText("Machine Learning Engineer", { exact: true })).toBeVisible();
  await expect(page.getByText("5 hours every day", { exact: true })).toBeVisible();
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await expect(page.getByRole("spinbutton")).toHaveCount(0);
  await page.getByRole("button", { name: "Start Training" }).click();
  await expect(page).toHaveURL(/\/quests\/assignment-/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1, name: "The Courage to Begin" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Execution Steps" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Success Criteria" })).toBeVisible();
});
