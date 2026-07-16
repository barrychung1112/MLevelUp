import { expect, test } from "@playwright/test";

import { expectOnboarding } from "./helpers";

test.setTimeout(45_000);

test("a fresh visitor validates and completes the standard training contract", async ({
  page,
}) => {
  await page.goto("/");
  await expectOnboarding(page);

  await page.getByRole("button", { name: "建立訓練契約" }).click();

  await expect(page.getByText("請修正標示的訓練設定。")).toBeVisible();
  await expect(page.getByLabel("訓練目標")).toHaveAccessibleDescription(
    "請選擇訓練目標",
  );
  await expect(page.getByRole("group", { name: "訓練契約" })).toHaveAccessibleDescription(
    "請選擇訓練契約",
  );
  await expect(page.getByLabel("每週投入分鐘數")).toHaveAccessibleDescription(
    "每週投入時間必須大於 0 分鐘",
  );

  await page.getByLabel("訓練目標").selectOption("job-ready");
  await page.getByLabel("普通人模式").check();
  await page.getByLabel("每週投入分鐘數").fill("600");
  await page.getByRole("button", { name: "建立訓練契約" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "今日訓練指揮中心" }),
  ).toBeVisible();
  await expect(page.getByText("普通人模式", { exact: true })).toBeVisible();
  await expect(page.getByRole("article", { name: "今日主要任務" })).toContainText(
    "Ship a reproducible baseline",
  );
});
