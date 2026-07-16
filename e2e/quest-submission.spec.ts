import { expect, test } from "@playwright/test";

import {
  COMPLETED_PRIMARY_SKILL_VALUES,
  completeStandardOnboarding,
  expectSkillValues,
  gotoRoute,
  INITIAL_SKILL_VALUES,
  LONG_REFLECTION,
  openPrimaryQuest,
  submitEvidence,
  VALID_GITHUB_COMMIT,
} from "./helpers";

test.setTimeout(90_000);

async function expectInvalidSubmissionState(
  page: Parameters<typeof expectSkillValues>[0],
  revisionCount: number,
) {
  await gotoRoute(page, "/progress", "能力成長");
  await expect(page.getByText("Level 1 · 0 / 500 XP", { exact: true })).toBeVisible();
  await expectSkillValues(page, INITIAL_SKILL_VALUES);

  await gotoRoute(page, "/portfolio", "私人作品集");
  await expect(page.getByText("私人作品集尚無成果", { exact: true })).toBeVisible();

  await gotoRoute(page, "/archive", "Training Archive");
  const activities = page.getByRole("main").locator("ol > li");
  await expect(activities).toHaveCount(revisionCount);
  for (const activity of await activities.all()) {
    await expect(activity).toContainText("Submission needs revision");
  }
  await expect(page.getByText(/Quest completed for/i)).toHaveCount(0);
  await expect(page.getByText(/Portfolio artifact created/i)).toHaveCount(0);
}

test("invalid GitHub evidence awards nothing and a valid revision updates the full record", async ({
  page,
}) => {
  await completeStandardOnboarding(page);
  await expect(page.getByText("0 / 500 XP", { exact: true })).toBeVisible();
  await openPrimaryQuest(page);

  await submitEvidence(
    page,
    "http://github.com/openai/openai-cookbook/commit/unsafe",
    "too short",
  );

  await expect(page.getByText(/Invalid evidence: commit/i)).toBeVisible();
  await expect(
    page.getByText(/Reflection must contain at least 40 characters/i),
  ).toBeVisible();
  await expect(
    page.getByText("Quest detail · needs_revision", { exact: true }),
  ).toBeVisible();
  await expectInvalidSubmissionState(page, 1);

  await page.goto("/dashboard");
  await openPrimaryQuest(page);
  await submitEvidence(
    page,
    "https://gitlab.com/openai/openai-cookbook/commit/wrong-host",
    LONG_REFLECTION,
  );

  await expect(page.getByText(/Invalid evidence: commit/i)).toBeVisible();
  await expect(
    page.getByText("Quest detail · needs_revision", { exact: true }),
  ).toBeVisible();
  await expectInvalidSubmissionState(page, 2);

  await page.goto("/dashboard");
  await openPrimaryQuest(page);
  await submitEvidence(page, VALID_GITHUB_COMMIT, LONG_REFLECTION);

  await expect(
    page.getByRole("heading", { level: 1, name: "任務驗證完成" }),
  ).toBeVisible();
  await expect(page.getByText("品質 100 / 100 · 獲得 106 XP", { exact: true })).toBeVisible();

  await page.goto("/dashboard");
  await expect(
    page.getByText("Evidence verified in Demo mode. The quest reward is ready.", {
      exact: true,
    }),
  ).toBeVisible();

  await page.goto("/progress");
  await expect(page.getByText("Level 1 · 106 / 500 XP", { exact: true })).toBeVisible();
  await expectSkillValues(page, COMPLETED_PRIMARY_SKILL_VALUES);

  await page.goto("/portfolio");
  const artifact = page.getByRole("listitem").filter({
    hasText: "Ship a reproducible baseline",
  });
  await expect(artifact).toContainText("Quality 100 / 100");
  await expect(artifact).toContainText("verified");

  await page.goto("/archive");
  const completedEvent = page.getByRole("listitem").filter({
    hasText: "Quest completed for 106 XP.",
  });
  await expect(completedEvent).toContainText("Ship a reproducible baseline");
  const artifactEvent = page.getByRole("listitem").filter({
    hasText: "Portfolio artifact created",
  });
  await expect(artifactEvent).toContainText("Ship a reproducible baseline");
});
