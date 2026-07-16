import { expect, test } from "@playwright/test";

import {
  completePrimaryQuest,
  completeStandardOnboarding,
  expectSkillValues,
  expectOnboarding,
  INITIAL_SKILL_VALUES,
  navigateToPrimaryQuest,
} from "./helpers";

test.setTimeout(90_000);

test("completed progress survives reload and confirmed reset restores the seed", async ({
  page,
}) => {
  await completeStandardOnboarding(page);
  await completePrimaryQuest(page);

  await page.goto("/progress");
  await expect(page.getByText("Level 1 · 106 / 500 XP", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Level 1 · 106 / 500 XP", { exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Modeling" })).toHaveAttribute(
    "aria-valuenow",
    "20.336",
  );

  await page.goto("/portfolio");
  await expect(page.getByText("Ship a reproducible baseline", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Quality 100 / 100", { exact: true })).toBeVisible();

  await page.goto("/profile");
  await page.getByRole("button", { name: "重設 Demo 資料" }).click();
  const confirmation = page.getByRole("dialog", { name: "確認重設 Demo 資料" });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "確認重設" }).click();

  await expectOnboarding(page);

  await page.getByLabel("訓練目標").selectOption("job-ready");
  await page.getByLabel("普通人模式").check();
  await page.getByLabel("每週投入分鐘數").fill("600");
  await page.getByRole("button", { name: "建立訓練契約" }).click();
  await expect(page.getByText("0 / 500 XP", { exact: true })).toBeVisible();
  await expect(page.getByText("普通人模式", { exact: true })).toBeVisible();

  await navigateToPrimaryQuest(page);
  await expect(page.getByText("Quest detail · in_progress", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "提交成果", exact: true })).toBeVisible();

  await page.goto("/progress");
  await expect(page.getByText("Level 1 · 0 / 500 XP", { exact: true })).toBeVisible();
  await expectSkillValues(page, INITIAL_SKILL_VALUES);

  await page.goto("/portfolio");
  await expect(page.getByText("私人作品集尚無成果", { exact: true })).toBeVisible();
  await page.goto("/archive");
  await expect(page.getByText("Training Archive 尚無紀錄", { exact: true })).toBeVisible();
});
