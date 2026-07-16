import { expect, test } from "@playwright/test";

import { completeStandardOnboarding } from "./helpers";

test.setTimeout(90_000);

const destinations = [
  { link: "任務終端", path: "/dashboard", heading: "今日訓練指揮中心" },
  { link: "每日任務", path: "/quests", heading: "今日任務" },
  { link: "學習資源", path: "/resources", heading: "學習資源" },
  { link: "能力成長", path: "/progress", heading: "能力成長" },
  { link: "訓練紀錄", path: "/archive", heading: "Training Archive 尚無紀錄" },
  { link: "私人作品集", path: "/portfolio", heading: "私人作品集尚無成果" },
  { link: "Agent 狀態", path: "/agents", heading: "Agent 狀態" },
  { link: "個人設定", path: "/profile", heading: "個人設定" },
] as const;

test("desktop navigation reaches useful content on every Phase 1 route", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await completeStandardOnboarding(page);

  for (const destination of destinations) {
    const navigation = page.getByRole("navigation", { name: "桌面主要導覽" });
    const link = navigation.getByRole("link", { name: destination.link, exact: true });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${destination.path}$`), {
      timeout: 15_000,
    });
    await expect(
      page.getByRole("heading", { name: destination.heading }),
    ).toBeVisible();
    await expect(page.getByRole("main")).not.toBeEmpty();
  }
});

test("mobile navigation exposes no more than five labeled destinations", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await completeStandardOnboarding(page);

  const navigation = page.getByRole("navigation", { name: "主要行動導覽" });
  await expect(navigation).toBeVisible();
  const links = navigation.getByRole("link");
  expect(await links.count()).toBeLessThanOrEqual(5);
  for (const link of await links.all()) {
    await expect(link).not.toHaveAccessibleName("");
  }

  await navigation.getByRole("link", { name: "能力成長", exact: true }).click();
  await expect(page).toHaveURL(/\/progress$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "能力成長" }),
  ).toBeVisible();
});
