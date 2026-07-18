import { expect, test } from "@playwright/test";
import { completeStandardOnboarding, navigateToPrimaryQuest } from "./helpers";

test("the initial primary quest is the courage calibration challenge", async ({ page }) => {
  await completeStandardOnboarding(page);
  await expect(page.getByText("難度 2 / 5")).toBeVisible(); await expect(page.getByText("120 分鐘")).toBeVisible();
  await navigateToPrimaryQuest(page); await expect(page.getByRole("heading", { name: "挑戰的勇氣" })).toBeVisible();
});
