import { expect, test } from "@playwright/test";

import { completeStandardOnboarding, expectOnboarding } from "./helpers";

test("fixed profile settings survive reload and reset returns to onboarding", async ({ page }) => {
  await completeStandardOnboarding(page);
  await page.goto("/profile");
  await expect(page.getByText("機器學習工程師", { exact: true })).toBeVisible();
  await expect(page.getByText("每日固定 5 小時", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("每日固定 5 小時", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "重設訓練資料" }).click();
  await page.getByRole("dialog", { name: "確認重設訓練資料？" }).getByRole("button", { name: "確認重設" }).click();
  await expectOnboarding(page);
  await expect(page.getByRole("dialog", { name: "挑戰者警告" })).toBeVisible();
});
