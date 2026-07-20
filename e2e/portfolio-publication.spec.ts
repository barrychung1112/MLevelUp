import { expect, test } from "@playwright/test";

import { completeStandardOnboarding, navigateToPrimaryQuest } from "./helpers";

test.setTimeout(90_000);

test("learner publishes verified evidence and can hide the portfolio without deleting it", async ({ page }) => {
  await completeStandardOnboarding(page);
  await navigateToPrimaryQuest(page);
  const evidenceFields = page.getByRole("textbox");
  await expect(evidenceFields).toHaveCount(4);
  await evidenceFields.nth(0).fill("https://github.com/example/project/commit/abc123");
  await evidenceFields.nth(1).fill("validation_accuracy: 0.82");
  await evidenceFields.nth(2).fill("The baseline uses a fixed validation split and records an exact reproducible metric.");
  await evidenceFields.nth(3).fill("I fixed the data split before training, recorded validation accuracy, and documented the commit so the experiment is reproducible. Next I will compare error slices and verify that feature preparation has no leakage.");
  await page.locator("main button").last().click();
  await expect(page.getByText("Demo", { exact: true })).toBeVisible({ timeout: 15_000 });

  await page.goto("/portfolio");
  await page.getByLabel("Display name").fill("Barry");
  await page.getByLabel("Public slug").fill("barry-ml");
  await page.getByLabel("Headline").fill("Machine Learning Engineer in Training");
  await page.getByRole("button", { name: "Save public profile" }).click();
  await expect(page.getByText(/Portfolio remains private/)).toBeVisible();
  await page.getByRole("button", { name: /Publish artifact:/ }).first().click();
  await page.getByLabel("Public summary").fill("A reproducible machine-learning artifact with explicit evaluation evidence.");
  await page.getByRole("button", { name: "Confirm publication" }).click();
  await expect(page.getByRole("heading", { name: "Published" }).locator(".." )).toContainText("1");
  await page.getByRole("button", { name: "Publish portfolio" }).click();
  await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Hide portfolio" }).click();
  await expect(page.getByText("PRIVATE", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Published" }).locator(".." )).toContainText("1");
});
