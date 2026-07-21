import { expect, type Page } from "@playwright/test";

export async function expectOnboarding(page: Page) {
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole("heading", { level: 1, name: "What do you want to become?" })).toBeVisible();
}

export async function completeStandardOnboarding(page: Page) {
  await page.goto("/");
  await expectOnboarding(page);
  await page.getByRole("button", { name: "Accept the Challenge" }).click();
  await expect(page.getByRole("dialog", { name: "Challenger Warning" })).not.toBeVisible();
  await expect(page.getByText("Machine Learning Engineer", { exact: true })).toBeVisible();
  await expect(page.getByText("5 hours every day", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Start Training" }).click();
  await expect(page).toHaveURL(/\/quests\/assignment-/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1, name: "The Courage to Begin" })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: "Training Command Center" })).toBeVisible();
}

export async function gotoRoute(page: Page, path: string, heading: string) {
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1, name: heading, exact: true })).toBeVisible({ timeout: 15_000 });
}

export async function navigateToPrimaryQuest(page: Page) {
  await page.getByRole("button", { name: "Open Mainline Mission" }).click();
  await expect(page).toHaveURL(/\/quests\/assignment-/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1, name: "The Courage to Begin" })).toBeVisible({ timeout: 15_000 });
}
