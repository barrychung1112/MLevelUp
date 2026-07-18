import { expect, test } from "@playwright/test";

import { completeStandardOnboarding, navigateToPrimaryQuest } from "./helpers";

test("the initial primary quest is executable and measurable", async ({ page }) => {
  await completeStandardOnboarding(page);
  await expect(page.getByRole("heading", { name: "大型主線任務" })).toBeVisible();
  await navigateToPrimaryQuest(page);
  await expect(page.getByRole("heading", { name: "執行步驟" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "成功衡量標準" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "本次不做" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "任務資源" })).toBeVisible();
  await expect(page.getByRole("button", { name: "提交成果" })).toBeVisible();
});

test("the courage challenge accepts all required evidence and labels Demo feedback", async ({ page }) => {
  await completeStandardOnboarding(page);
  await navigateToPrimaryQuest(page);

  await page.getByLabel("成果連結").fill("https://github.com/example/project/commit/abc123");
  await page.getByLabel("指標結果").fill("validation_accuracy: 0.82");
  await page.getByLabel("成果文字").fill(
    "The baseline uses a fixed validation split and records the exact metric for a reproducible comparison.",
  );
  await page.getByLabel("自我反思").fill(
    "I fixed the data split before training, recorded validation accuracy, and documented the commit so the experiment can be reproduced. The next iteration should compare error slices and confirm that no validation data leaked into feature preparation.",
  );
  await page.getByRole("button", { name: "提交成果" }).click();

  await expect(page.getByText("Demo", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Evidence verified in Demo mode/u)).toBeVisible();
});
