import { expect, type Page } from "@playwright/test";

export const INITIAL_SKILL_VALUES = {
  "Data Handling": "20",
  Modeling: "20",
  Evaluation: "20",
  Engineering: "20",
  "Research Sense": "20",
  "Product Thinking": "20",
  Communication: "20",
} as const;

export const COMPLETED_PRIMARY_SKILL_VALUES = {
  "Data Handling": "20.088",
  Modeling: "20.336",
  Evaluation: "20.168",
  Engineering: "20.168",
  "Research Sense": "20",
  "Product Thinking": "20",
  Communication: "20.088",
} as const;

export const VALID_GITHUB_COMMIT =
  "https://github.com/openai/openai-cookbook/commit/0123456789abcdef";

export const LONG_REFLECTION = [
  "I reproduced the baseline with a fixed validation split and recorded the seed.",
  "The result exposes the tradeoff between model complexity and reliable evaluation.",
  "My next experiment will isolate the weakest error slice and compare it with the same metric.",
].join(" ");

export async function expectOnboarding(page: Page) {
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "建立你的訓練契約" }),
  ).toBeVisible();
}

export async function completeStandardOnboarding(page: Page) {
  await page.goto("/");
  await expectOnboarding(page);

  await page.getByLabel("訓練目標").selectOption("job-ready");
  await page.getByLabel("普通人模式").check();
  await page.getByLabel("每週投入分鐘數").fill("600");
  await page.getByRole("button", { name: "建立訓練契約" }).click();

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  await expect(
    page.getByRole("heading", { level: 1, name: "今日訓練指揮中心" }),
  ).toBeVisible();
  await expect(page.getByText("普通人模式", { exact: true })).toBeVisible();
}

export async function gotoRoute(
  page: Page,
  path: string,
  heading: string,
) {
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), {
    timeout: 15_000,
  });
  await expect(
    page.getByRole("heading", { level: 1, name: heading, exact: true }),
  ).toBeVisible({ timeout: 15_000 });
}

export async function expectSkillValues(
  page: Page,
  expected: Readonly<Record<string, string>>,
) {
  const progressBars = page.getByRole("progressbar");
  await expect(progressBars).toHaveCount(7);

  for (const [label, value] of Object.entries(expected)) {
    await expect(page.getByRole("progressbar", { name: label })).toHaveAttribute(
      "aria-valuenow",
      value,
    );
  }
}

export async function navigateToPrimaryQuest(page: Page) {
  await page.getByRole("button", { name: "開始主要任務" }).click();
  await expect(page).toHaveURL(/\/quests\/assignment-/, { timeout: 15_000 });
  await expect(
    page.getByRole("heading", { level: 1, name: "Ship a reproducible baseline" }),
  ).toBeVisible({ timeout: 15_000 });
}

export async function openPrimaryQuest(page: Page) {
  await navigateToPrimaryQuest(page);

  const startButton = page.getByRole("button", { name: "開始任務", exact: true });
  if (await startButton.isVisible()) {
    await startButton.click();
    await expect(
      page.getByText("Quest detail · in_progress", { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
  }

  await expect(page.getByRole("button", { name: "提交成果", exact: true })).toBeVisible({
    timeout: 15_000,
  });
}

export async function submitEvidence(
  page: Page,
  url: string,
  reflection: string,
) {
  await page.getByLabel("成果網址").fill(url);
  await page.getByLabel("自我反思").fill(reflection);
  await page.getByRole("button", { name: "提交成果" }).click();
}

export async function completePrimaryQuest(page: Page) {
  await openPrimaryQuest(page);
  await submitEvidence(page, VALID_GITHUB_COMMIT, LONG_REFLECTION);
  await expect(
    page.getByRole("heading", { level: 1, name: "任務驗證完成" }),
  ).toBeVisible();
  await expect(page.getByText("品質 100 / 100 · 獲得 106 XP", { exact: true })).toBeVisible();
}
