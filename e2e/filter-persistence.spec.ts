import { expect, test } from "@playwright/test";

import { completeStandardOnboarding, gotoRoute } from "./helpers";

test.setTimeout(90_000);

test("resource filters survive cross-route navigation and browser back", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await completeStandardOnboarding(page);

  await gotoRoute(page, "/resources", "學習資源");

  await page.getByLabel("資源類型").selectOption("repository");
  await expect(page).toHaveURL(/\/resources\?type=repository$/, {
    timeout: 15_000,
  });
  await expect(page.getByLabel("資源類型")).toHaveValue("repository");
  await expect(page.getByText("Reproducible baselines")).toBeVisible();
  await expect(
    page.getByText("Practical exploratory data analysis"),
  ).not.toBeVisible();

  await gotoRoute(page, "/progress", "能力成長");
  await page.goBack();

  await expect(page).toHaveURL(/\/resources\?type=repository$/, {
    timeout: 15_000,
  });
  await expect(
    page.getByRole("heading", { level: 1, name: "學習資源", exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel("資源類型")).toHaveValue("repository");
  await expect(page.getByText("Reproducible baselines")).toBeVisible();
  await expect(
    page.getByText("Practical exploratory data analysis"),
  ).not.toBeVisible();
});
