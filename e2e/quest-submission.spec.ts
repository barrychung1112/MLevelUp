import { expect, test } from "@playwright/test";

import { completeStandardOnboarding, navigateToPrimaryQuest } from "./helpers";

test("the initial primary quest is executable and measurable", async ({ page }) => {
  await completeStandardOnboarding(page);
  await expect(page.getByRole("heading", { name: "大型主線任務" })).toBeVisible();
  await navigateToPrimaryQuest(page);
  await expect(page.getByRole("heading", { name: "執行步驟" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "成功衡量標準" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "本次不做" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "任務資源" })).toBeVisible();
  await expect(page.getByRole("button", { name: "提交成果" })).toBeVisible();
});
