import type { Page } from "@playwright/test";
import { expect, test } from "./support/no-egress";
import boardlab from "../src/i18n/messages/en/boardlab.json";
import { dockCopy, openDock } from "./dock-shared";

const PAGES = [
  "/en",
  "/en/boards",
  "/en/boards/uno-r3/blink",
  "/en/robotics/uno-r3-build",
  "/en/drones/quad5",
  "/en/drones/quad5/fly",
  "/en/about",
  "/en/together",
  "/de",
];

// Everything a visitor with no keys and no server could trip over, with the URL that did it.
function watchTrouble(page: Page) {
  const trouble: string[] = [];
  page.on("pageerror", (error) => trouble.push(`page error: ${error.message}`));
  page.on("requestfailed", (request) => {
    if (request.failure()?.errorText !== "net::ERR_ABORTED") trouble.push(`failed: ${request.url()} (${request.failure()?.errorText})`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) trouble.push(`${response.status()}: ${response.url()}`);
  });
  return trouble;
}

test("a visitor with no keys and no server walks the app without a single failure", async ({ page }) => {
  const trouble = watchTrouble(page);

  for (const path of PAGES) {
    const before = trouble.length;
    await page.goto(path);
    await expect(page.locator("main").first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(trouble.slice(before), path).toEqual([]);
  }

  await page.goto("/en/boards/uno-r3/blink");
  const main = page.locator("main#main-en");
  await expect(main.locator(".cm-content")).toBeVisible({ timeout: 20_000 });
  await main.getByTestId("run-button").click();
  await expect(main.getByTestId("serial-lines")).toContainText(boardlab.serial.upload.done, { timeout: 10_000 });

  const dock = await openDock(page, false);
  await dock.getByRole("tab", { name: dockCopy.tabs.partner }).click();
  await expect(dock.getByTestId("not-set-up")).toHaveCount(1);
  await expect(dock.getByTestId("not-set-up")).toHaveAttribute("data-reason", "server_off");

  await dock.getByRole("tab", { name: dockCopy.tabs.together }).click();
  await dock.getByRole("tab", { name: dockCopy.tabs.real }).click();
  await expect(dock.getByTestId("not-set-up").last()).toBeVisible();

  expect(trouble).toEqual([]);
});
