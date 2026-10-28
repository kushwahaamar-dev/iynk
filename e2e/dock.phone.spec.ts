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
