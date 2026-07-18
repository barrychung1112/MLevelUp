import { expect, test } from "@playwright/test";
import { completeStandardOnboarding, expectOnboarding } from "./helpers";

test("profile settings survive reload and reset returns to onboarding", async ({ page }) => {
  await completeStandardOnboarding(page); await page.goto("/profile");
  await page.getByLabel("訓練目標").selectOption("competition"); await page.getByLabel("每週可投入分鐘").fill("900"); await page.getByRole("button", { name: "儲存設定" }).click();
  await page.reload(); await expect(page.getByLabel("訓練目標")).toHaveValue("competition"); await expect(page.getByLabel("每週可投入分鐘")).toHaveValue("900");
  await page.getByRole("button", { name: "重設訓練資料" }).click(); await page.getByRole("dialog", { name: "確認重設訓練資料？" }).getByRole("button", { name: "確認重設" }).click();
  await expectOnboarding(page); await expect(page.getByRole("dialog", { name: "挑戰者警告" })).toBeVisible();
});
