import { expect, test } from "@playwright/test";

test("shows the MLevelUp root entry", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "MLevelUp" }),
  ).toBeVisible();
});
