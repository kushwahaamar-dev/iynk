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
