import { expect, test } from "@playwright/test";

import { completeStandardOnboarding, navigateToPrimaryQuest } from "./helpers";

test("the initial primary quest is executable and measurable", async ({ page }) => {
  await completeStandardOnboarding(page);
  await expect(page.getByRole("heading", { name: "Mainline Mission" })).toBeVisible();
  await navigateToPrimaryQuest(page);
  await expect(page.getByRole("heading", { name: "Execution Steps" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Success Criteria" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Out of Scope" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mission Resources" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit Evidence" })).toBeVisible();
});

test("the courage challenge accepts all required evidence and labels Demo feedback", async ({ page }) => {
  await completeStandardOnboarding(page);
  await navigateToPrimaryQuest(page);

  await page.getByLabel("Evidence URL").fill("https://github.com/example/project/commit/abc123");
  await page.getByLabel("Metric result").fill("validation_accuracy: 0.82");
  await page.getByLabel("Evidence notes").fill(
    "The baseline uses a fixed validation split and records the exact metric for a reproducible comparison.",
  );
  await page.getByLabel("Self-reflection").fill(
    "I fixed the data split before training, recorded validation accuracy, and documented the commit so the experiment can be reproduced. The next iteration should compare error slices and confirm that no validation data leaked into feature preparation.",
  );
  await page.getByRole("button", { name: "Submit Evidence" }).click();

  await expect(page.getByText("Demo", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Evidence verified in Demo mode/u)).toBeVisible();
});
