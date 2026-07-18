import { expect, test } from "@playwright/test";
import { completeStandardOnboarding } from "./helpers";
const paths = ["/dashboard", "/quests", "/resources", "/progress", "/archive", "/portfolio", "/agents", "/profile"];

test("desktop navigation reaches every training route", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await completeStandardOnboarding(page);
  const navigation = page.locator("aside nav").first();
  for (const path of paths) { await navigation.locator(`a[href="${path}"]`).click(); await expect(page).toHaveURL(new RegExp(`${path}$`)); await expect(page.getByRole("main")).not.toBeEmpty(); }
});

test("mobile navigation keeps its labeled destinations reachable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 }); await completeStandardOnboarding(page);
  const navigation = page.locator("nav.fixed"); await expect(navigation).toBeVisible(); expect(await navigation.getByRole("link").count()).toBeLessThanOrEqual(5);
});
