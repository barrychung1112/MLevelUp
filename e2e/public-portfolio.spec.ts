import { expect, test } from "@playwright/test";

test("anonymous visitor sees only the public evidence projection", async ({ page }) => {
  await page.goto("/p/demo-ml-engineer");
  await expect(page.getByRole("heading", { level: 1, name: "MLevelUp Pathfinder" })).toBeVisible();
  await expect(page.getByText("Evidence-backed skills")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("self_reflection");
  await expect(page.locator("body")).not.toContainText("reviewer_notes");
  await expect(page.locator('a[href^="http:"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
});

test("unknown portfolio returns a non-disclosing 404", async ({ page }) => {
  const response = await page.goto("/p/not-a-real-portfolio");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("Portfolio unavailable")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("hidden");
});
