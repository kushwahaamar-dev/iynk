import { expect, test } from "./support/no-egress";
import shell from "../src/i18n/messages/en/shell.json";
import { dockCopy, expectTabs, LAB_PAGES, openDock, watchErrors } from "./dock-shared";

for (const lab of LAB_PAGES) {
  test(`dock tabs open on the ${lab.name} page`, async ({ page }) => {
    const errors = watchErrors(page);
    const response = await page.goto(lab.path);
    expect(response?.status(), lab.path).toBe(200);
    const dock = await openDock(page, false);
    await expectTabs(dock);
    expect(errors).toEqual([]);
  });
}

test("Together is in the nav", async ({ page }) => {
  await page.goto("/en/boards/nano");
  await openDock(page, false);
  await expect(page.locator("header:visible").getByRole("link", { name: shell.nav.together })).toBeVisible();
});

test("a room link opens Together, and a hidden tab event does not reveal Hardware", async ({ page }) => {
  await page.goto("/en/boards/nano?room=k7m2qx");
  const dock = await openDock(page, false);
  await expect(dock.getByRole("tab", { name: dockCopy.tabs.together })).toHaveAttribute("aria-selected", "true");
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("iynk:dock-tab", { detail: { tab: "hardware" } }));
  });
  await expect(dock.getByRole("tab", { name: dockCopy.tabs.hardware })).toHaveCount(0);
  await expect(dock.getByRole("tab", { name: dockCopy.tabs.together })).toHaveAttribute("aria-selected", "true");
});

for (const [w, h] of [[1440, 900], [1920, 1080]]) {
  test.describe(`on a ${w} px desk`, () => {
    test.use({ viewport: { width: w, height: h } });

    test("the open drawer takes its width from the stage, down to 34rem, before the rail", async ({ page }) => {
      await page.goto("/en/boards/nano/blink");
      const width = (selector: string) => page.locator(`main:visible ${selector}`).first().evaluate((el) => el.getBoundingClientRect().width);
      const stage = await width(".ws-stage");
      const rail = await width(".ws-rail");
      await openDock(page, false);
      // The 416 px drawer pushes the page over. At 1920 the code keeps its whole width; at 1440 the stage stops at
      // 34rem (544 px) and the rail gives up the rest, never below 22rem (352 px).
      await expect.poll(() => width(".ws-stage")).toBeLessThan(stage - 100);
      expect(await width(".ws-stage")).toBeGreaterThanOrEqual(544);
      const docked = await width(".ws-rail");
      expect(docked).toBeGreaterThanOrEqual(352);
      if (w >= 1920) expect(docked).toBeCloseTo(rail, 0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    });
  });
}
