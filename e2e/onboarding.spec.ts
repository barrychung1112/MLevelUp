import { expect, test } from "@playwright/test";
import { expectOnboarding } from "./helpers";

test("a fresh visitor accepts the oath and receives the courage challenge", async ({ page }) => {
  await page.goto("/"); await expectOnboarding(page);
  await expect(page.getByRole("dialog", { name: "挑戰者警告" })).toBeVisible();
  await expect(page.getByText("這是一條成為強者的道路。")).toBeVisible();
  await page.getByRole("button", { name: "接受挑戰" }).click();
  await page.getByRole("button", { name: "開始第一項挑戰" }).click();
  await expect(page.getByText("請選擇訓練目標")).toBeVisible();
  await page.getByLabel("訓練目標").selectOption("job-ready"); await page.getByLabel("每週可投入分鐘").fill("600");
  await page.getByRole("button", { name: "開始第一項挑戰" }).click();
  await expect(page).toHaveURL(/\/quests\/assignment-/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1, name: "挑戰的勇氣" })).toBeVisible();
});
