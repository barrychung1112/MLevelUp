import { expect, test } from "@playwright/test";

import { expectOnboarding } from "./helpers";

test("a fresh visitor accepts the oath and receives the courage challenge", async ({ page }) => {
  await page.goto("/");
  await expectOnboarding(page);
  await expect(page.getByRole("dialog", { name: "挑戰者警告" })).toBeVisible();
  await expect(page.getByText("這是一條成為強者的道路。", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "接受挑戰" }).click();
  await expect(page.getByText("機器學習工程師", { exact: true })).toBeVisible();
  await expect(page.getByText("每日固定 5 小時", { exact: true })).toBeVisible();
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await expect(page.getByRole("spinbutton")).toHaveCount(0);
  await page.getByRole("button", { name: "開始訓練" }).click();
  await expect(page).toHaveURL(/\/quests\/assignment-/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1, name: "挑戰的勇氣" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "執行步驟" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "成功衡量標準" })).toBeVisible();
});
