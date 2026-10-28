import { expect, test } from "./support/no-egress";
import common from "../src/i18n/messages/en/common.json";
import shell from "../src/i18n/messages/en/shell.json";

const CANARY_KEY = "iynk-canary-KEY-0001-do-not-use";
const { keys, log } = common.client;

test("a page error shows in the local log, copies without the key, and clears", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/en");
  const header = page.locator("header:visible").first();
  await header.getByRole("button", { name: shell.settings.label }).click();
  await header.getByRole("dialog", { name: shell.settings.label }).getByRole("button", { name: keys.open }).click();
  const dialog = page.getByRole("dialog", { name: keys.title });
  await dialog.getByLabel(keys.ai.label, { exact: true }).fill(CANARY_KEY);
  await dialog.getByRole("button", { name: `${keys.save}: ${keys.ai.label}` }).click();

  await page.evaluate((key) => {
    setTimeout(() => {
      throw new Error(`boom with ${key}`);
    }, 0);
  }, CANARY_KEY);

  const list = dialog.getByTestId("local-log");
  await expect(list).toContainText("window.error");
  await expect(list).toContainText("boom with [key]");
  expect(await list.innerText()).not.toContain(CANARY_KEY);

  await dialog.getByRole("button", { name: log.copy }).click();
  await expect(dialog.getByText(log.copied)).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("boom with [key]");
  expect(copied).not.toContain(CANARY_KEY);

  await dialog.getByRole("button", { name: log.clear }).click();
  await expect(dialog.getByText(log.empty)).toBeVisible();
});
