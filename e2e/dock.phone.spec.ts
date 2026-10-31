import { expect, test } from "./support/no-egress";
import shell from "../src/i18n/messages/en/shell.json";
import { dockCopy, expectTabs, LAB_PAGES, openDock, watchErrors } from "./dock-shared";

test.use({ viewport: { width: 390, height: 844 } });

for (const lab of LAB_PAGES) {
  test(`the phone sheet opens dock tabs on the ${lab.name} page`, async ({ page }) => {
    const errors = watchErrors(page);
    const response = await page.goto(lab.path);
    expect(response?.status(), lab.path).toBe(200);
    const dock = await openDock(page, true);
    await expectTabs(dock);
    await page.getByRole("button", { name: dockCopy.close }).click();
    await expect(page.getByRole("dialog", { name: dockCopy.label })).toBeHidden();
    expect(errors).toEqual([]);
  });
}

test("the phone menu lists Together", async ({ page }) => {
  await page.goto("/en/boards/nano");
  await page.getByRole("button", { name: shell.nav.menu }).click();
  const menu = page.getByRole("dialog", { name: shell.nav.menu });
  await expect(menu.getByRole("link", { name: shell.nav.together })).toBeVisible();
});

test("the phone menu panel covers the screen and its links arrive one after another", async ({ page }) => {
  await page.goto("/en/boards/nano");
  await page.getByRole("button", { name: shell.nav.menu }).click();
  const panel = page.getByRole("dialog", { name: shell.nav.menu });
  await expect(panel).toBeVisible();
  const box = await panel.evaluate((el) => ({ height: el.getBoundingClientRect().height, inner: window.innerHeight }));
  expect(box.height).toBe(box.inner);
  const delay = await panel.locator("nav li a").last().evaluate((el) => getComputedStyle(el.closest("li")!).animationDelay);
  expect(parseFloat(delay) * (delay.endsWith("ms") ? 1 : 1000)).toBeLessThanOrEqual(360);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the phone menu links fade in place", async ({ page }) => {
    await page.goto("/en/boards/nano");
    await page.getByRole("button", { name: shell.nav.menu }).click();
    const first = page.getByRole("dialog", { name: shell.nav.menu }).locator("nav li").first();
    await expect(first).toBeVisible();
    // The rise keeps running as a fade, so the computed transform is the identity matrix, not "none".
    await expect.poll(() => first.evaluate((el) => getComputedStyle(el).transform)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
  });
});
