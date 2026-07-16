import { expect, test } from "@playwright/test";

import { completeStandardOnboarding } from "./helpers";

test.setTimeout(60_000);

const targetViewports = [
  { width: 375, height: 812, navigationName: "主要行動導覽", maximumLinks: 5 },
  { width: 768, height: 900, navigationName: "平板主要導覽" },
  { width: 1024, height: 900, navigationName: "平板主要導覽" },
  { width: 1440, height: 1000, navigationName: "桌面主要導覽" },
] as const;

for (const viewport of targetViewports) {
  test(`${viewport.width}px has no overflow and keeps navigation and actions reachable`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await completeStandardOnboarding(page);

    const navigation = page.getByRole("navigation", {
      name: viewport.navigationName,
    });
    await expect(navigation).toBeVisible();

    const links = navigation.getByRole("link");
    if ("maximumLinks" in viewport) {
      expect(await links.count()).toBeLessThanOrEqual(viewport.maximumLinks);
    }
    for (const link of await links.all()) {
      await expect(link).not.toHaveAccessibleName("");
    }

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth === document.documentElement.clientWidth,
      ),
    ).toBe(true);

    const primaryAction = page.getByRole("button", { name: "開始主要任務" });
    await primaryAction.scrollIntoViewIfNeeded();
    await expect(primaryAction).toBeVisible();

    const finalMainTarget = page
      .getByRole("main")
      .locator('a[href]:visible, button:visible, input:visible, select:visible, textarea:visible')
      .last();
    await finalMainTarget.scrollIntoViewIfNeeded();
    await finalMainTarget.focus();
    await expect(finalMainTarget).toBeVisible();
    await expect(finalMainTarget).toBeFocused();

    const [targetBox, navBox] = await Promise.all([
      finalMainTarget.boundingBox(),
      navigation.boundingBox(),
    ]);
    expect(targetBox).not.toBeNull();
    expect(navBox).not.toBeNull();

    const target = targetBox!;
    const nav = navBox!;
    expect(target.x).toBeGreaterThanOrEqual(0);
    expect(target.y).toBeGreaterThanOrEqual(0);
    expect(target.x + target.width).toBeLessThanOrEqual(viewport.width);
    expect(target.y + target.height).toBeLessThanOrEqual(viewport.height);

    const overlapsNavigation =
      target.x < nav.x + nav.width &&
      target.x + target.width > nav.x &&
      target.y < nav.y + nav.height &&
      target.y + target.height > nav.y;
    expect(overlapsNavigation).toBe(false);
  });
}
