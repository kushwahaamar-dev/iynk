import { expect, test } from "@playwright/test";
import shell from "../src/i18n/messages/en/shell.json";
import { dockCopy, expectSolanaNavHidden, expectTabs, LAB_PAGES, openDock, watchErrors } from "./dock-shared";

for (const lab of LAB_PAGES) {
  test(`dock tabs open on the ${lab.name} page`, async ({ page }) => {
    const errors = watchErrors(page);
    const response = await page.goto(lab.path);
    expect(response?.status(), lab.path).toBe(200);
    await expect(page.locator(`[data-lab-room="${lab.lab}"][data-lab-item="${lab.item}"]`).first()).toBeAttached();
    const dock = await openDock(page, false);
    await expectTabs(dock);
    expect(errors).toEqual([]);
  });
}

test("Together is in the nav and Passport and Verify stay hidden", async ({ page }) => {
  await page.goto("/en/boards/nano");
  await openDock(page, false);
  await expectSolanaNavHidden(page);
});

test("a room link opens Together, and a hidden tab event does not reveal Passport", async ({ page }) => {
  await page.goto("/en/boards/nano?room=k7m2qx");
  const dock = await openDock(page, false);
  await expect(dock.getByRole("tab", { name: dockCopy.tabs.together })).toHaveAttribute("aria-selected", "true");
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("simlab:dock-tab", { detail: { tab: "passport" } }));
    window.dispatchEvent(new CustomEvent("simlab:dock-tab", { detail: { tab: "hardware" } }));
  });
  await expect(dock.getByRole("tab", { name: dockCopy.tabs.passport })).toHaveCount(0);
  await expect(dock.getByRole("tab", { name: dockCopy.tabs.hardware })).toHaveCount(0);
  await expect(dock.getByRole("tab", { name: dockCopy.tabs.together })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("link", { name: shell.nav.passport })).toHaveCount(0);
});

test.describe("on a 1440 px desk", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the open drawer takes its width from the rail before the stage", async ({ page }) => {
    await page.goto("/en/boards/nano/blink");
    const width = (selector: string) => page.locator(`main:visible ${selector}`).first().evaluate((el) => el.getBoundingClientRect().width);
    const stage = await width(".ws-stage");
    await openDock(page, false);
    // The 416 px drawer pushes the page over; the rail drops to 22rem (352 px, its floor on a 1024 px screen) first.
    await expect.poll(() => width(".ws-rail")).toBeLessThanOrEqual(352.5);
    expect(await width(".ws-stage")).toBeGreaterThan(stage - 416 + 100);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
});
