import { expect, type Page } from "@playwright/test";

export async function expectOnboarding(page: Page) {
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole("heading", { level: 1, name: "設定你的訓練方向" })).toBeVisible();
}

export async function completeStandardOnboarding(page: Page) {
  await page.goto("/");
  await expectOnboarding(page);
  await page.getByRole("button", { name: "接受挑戰" }).click();
  await expect(page.getByRole("dialog", { name: "挑戰者警告" })).not.toBeVisible();
  await page.getByLabel("訓練目標").selectOption("job-ready");
  await page.getByLabel("每週可投入分鐘").fill("600");
  await page.getByRole("button", { name: "開始第一項挑戰" }).click();
  await expect(page).toHaveURL(/\/quests\/assignment-/, { timeout: 15_000 });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: "今日任務終端" })).toBeVisible();
  await expect(page.getByText("挑戰的勇氣", { exact: true })).toBeVisible();
}

export async function gotoRoute(page: Page, path: string, heading: string) {
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1, name: heading, exact: true })).toBeVisible({ timeout: 15_000 });
}

export async function navigateToPrimaryQuest(page: Page) {
  await page.getByRole("button", { name: "開啟主要任務" }).click();
  await expect(page).toHaveURL(/\/quests\/assignment-/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1, name: "挑戰的勇氣" })).toBeVisible({ timeout: 15_000 });
}
