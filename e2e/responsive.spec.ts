import { expect, test } from "@playwright/test";

import { completeStandardOnboarding } from "./helpers";

for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 900 }, { width: 1024, height: 900 }, { width: 1440, height: 1000 }]) {
  test(`${viewport.width}px keeps the mission dashboard usable`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await completeStandardOnboarding(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
    const action = page.getByRole("button", { name: "開啟主要任務" });
    await action.scrollIntoViewIfNeeded();
    await expect(action).toBeVisible();
  });
}
