import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./support/no-egress";
import common from "../src/i18n/messages/en/common.json";
import boardlab from "../src/i18n/messages/en/boardlab.json";
import shell from "../src/i18n/messages/en/shell.json";
import together from "../src/i18n/messages/en/together.json";
import { dockCopy, openDock } from "./dock-shared";
import { NAV } from "../src/components/shell/nav";

const LESSON = "/en/boards/uno-r3/blink";
const ROUTES = ["/en", "/en/boards", "/en/robotics", "/en/drones", "/en/together", "/en/about", LESSON];
const keys = common.client.keys;

// A native dialog is a bug in every case: dismiss it so the page doesn't hang and fail the test at the end.
function forbidDialogs(page: Page) {
  const seen: string[] = [];
  page.on("dialog", (dialog) => {
    seen.push(`${dialog.type()}: ${dialog.message()}`);
    void dialog.dismiss();
  });
  return seen;
}

const main = (page: Page) => page.locator("main").first();
const header = (page: Page) => page.locator("header:visible").first();

async function openLesson(page: Page) {
  await page.goto(LESSON);
  await expect(main(page).locator(".cm-content")).toBeVisible({ timeout: 20_000 });
}

async function openKeys(page: Page) {
  const settings = header(page).getByRole("button", { name: shell.settings.label });
  await settings.click();
  await header(page).getByRole("dialog", { name: shell.settings.label }).getByRole("button", { name: keys.open }).click();
  const dialog = page.getByRole("dialog", { name: keys.title });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** The field is invalid, and the message it points at is on screen and says something. */
async function expectInlineError(field: Locator, where: string) {
  await expect(field, `${where}: field marked invalid`).toHaveAttribute("aria-invalid", "true");
  const messageId = await field.getAttribute("aria-describedby");
  expect(messageId, `${where}: aria-describedby`).toBeTruthy();
  const message = field.page().locator(`[id="${messageId}"]`);
  await expect(message, `${where}: message visible`).toBeVisible();
  await expect(message, `${where}: message has text`).not.toHaveText("");
}

test("no primary action opens a native dialog", async ({ page }) => {
  const dialogs = forbidDialogs(page);

  await openLesson(page);
  await main(page).getByTestId("run-button").click();
  await expect(main(page).getByTestId("serial-lines")).toContainText(boardlab.serial.upload.done, { timeout: 10_000 });

  await page.goto("/en/together");
  await page.getByRole("button", { name: together.lobby.create.go }).click();
  await expect(page).toHaveURL(/room=/);

  await openLesson(page);
  const keysDialog = await openKeys(page);
  await keysDialog.getByRole("button", { name: `${keys.save}: ${keys.ai.label}` }).click();
  await page.keyboard.press("Escape");

  await openLesson(page);
  await main(page).getByRole("button", { name: boardlab.lesson.next }).first().click();
  await expect(page).not.toHaveURL(new RegExp(`${LESSON}$`));

  expect(dialogs).toEqual([]);
});

// Next keeps the old page on screen during a client side navigation between prerendered routes, so the skeleton only
// shows when a page is opened while its document and scripts are slow.
for (const { path, kind } of [
  { path: "/en/boards", kind: "list" },
  { path: LESSON, kind: "workspace" },
]) {
  test(`${path} shows a busy status skeleton while it is slow, then the page (${kind})`, async ({ page }) => {
    // The skeleton can be on screen for a few hundred milliseconds, so watch the DOM instead of polling for it.
    await page.addInitScript(() => {
      Object.assign(window, { skeletonSeen: false });
      new MutationObserver(() => {
        if (document.querySelector('[role="status"][aria-busy="true"]')) Object.assign(window, { skeletonSeen: true });
      }).observe(document, { childList: true, subtree: true });
    });
    await page.route("**/*", async (route) => {
      const request = route.request();
      const slow = request.resourceType() === "document" || request.headers()["rsc"] || request.url().includes("/_next/static/chunks/");
      if (slow) await new Promise((resolve) => setTimeout(resolve, 700));
      await route.fallback();
    });

    await page.goto(path);
    await expect(main(page).getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });

    expect(await page.evaluate(() => (window as unknown as { skeletonSeen: boolean }).skeletonSeen), `${path}: skeleton before content`).toBe(true);
    await expect(page.locator('[role="status"][aria-busy="true"]'), `${path}: no skeleton once loaded`).toHaveCount(0);
  });
}

test("the partner tab, the chat panel and the serial monitor say what is empty", async ({ page }) => {
  await openLesson(page);
  await expect(main(page).getByTestId("serial-lines")).toContainText(boardlab.serial.empty);

  const dock = await openDock(page, false);
  await dock.getByRole("tab", { name: dockCopy.tabs.partner }).click();
  await expect(dock.getByTestId("not-set-up")).toBeVisible();

  await dock.getByRole("tab", { name: dockCopy.tabs.together }).click();
  await dock.getByRole("button", { name: together.panel.start }).click();
  await dock.getByLabel(together.identity.name).fill("Ana");
  await dock.getByRole("button", { name: together.identity.save }).click();

  const empty = dock.getByText(together.chat.empty);
  await expect(empty).toBeVisible();
  const card = empty.locator("xpath=..");
  await expect(card.locator("svg"), "chat empty state has an icon").toHaveCount(1);
});

test("the identity form and the keys dialog show inline errors on the field", async ({ page }) => {
  await openLesson(page);
  const dock = await openDock(page, false);
  await dock.getByRole("tab", { name: dockCopy.tabs.together }).click();
  await dock.getByRole("button", { name: together.panel.start }).click();
  await dock.getByRole("button", { name: together.identity.save }).click();
  await expectInlineError(dock.getByLabel(together.identity.name), "identity form with an empty name");

  await page.goto(LESSON);
  const dialog = await openKeys(page);
  await dialog.getByLabel(keys.ai.label, { exact: true }).fill("bad");
  await dialog.getByRole("button", { name: `${keys.save}: ${keys.ai.label}` }).click();
  await expectInlineError(dialog.getByLabel(keys.ai.label, { exact: true }), "keys dialog with a bad key");
});

test("disabled buttons look disabled", async ({ page }) => {
  const check = async (where: string) => {
    const bad = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLButtonElement>("button:disabled")].flatMap((button) => {
        const style = getComputedStyle(button);
        const looksDisabled = Number(style.opacity) < 1 && style.cursor === "not-allowed";
        return looksDisabled ? [] : [`${button.getAttribute("aria-label") ?? button.textContent?.trim()} (opacity ${style.opacity}, cursor ${style.cursor})`];
      }),
    );
    expect(bad, `${where}: disabled buttons that look enabled`).toEqual([]);
  };

  for (const route of ROUTES) {
    await page.goto(route);
    await expect(main(page)).toBeVisible();
    await page.waitForLoadState("networkidle");
    await check(route);
  }

  await openLesson(page);
  const dock = await openDock(page, false);
  await dock.getByRole("tab", { name: dockCopy.tabs.together }).click();
  await check(`${LESSON} dock, Together tab`);
  await dock.getByRole("tab", { name: dockCopy.tabs.real }).click();
  await check(`${LESSON} dock, Real tab`);

  await openKeys(page);
  await check(`${LESSON} keys dialog`);
});

test("no link goes nowhere", async ({ page, request, baseURL }) => {
  for (const route of ROUTES) {
    await page.goto(route);
    await expect(main(page)).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(await page.locator('a[href="#"]').count(), `${route}: a[href="#"]`).toBe(0);
  }

  await page.goto("/en");
  const hrefs = await page.locator("a[href]").evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).href));
  const local = [...new Set(hrefs.map((href) => new URL(href)).filter((url) => url.origin === new URL(baseURL!).origin).map((url) => url.origin + url.pathname + url.search))];
  expect(local.length, "/en has links to check").toBeGreaterThan(5);
  for (const url of local) {
    const response = await request.head(url);
    expect(response.status(), `/en link ${url}`).toBeLessThan(400);
  }
});

test.describe("the header marks where you are", () => {
  const entries = NAV.filter((entry) => entry.bar);
  const pages = [...entries.map((entry) => ({ path: `/en${entry.href}`, label: shell.nav[entry.id] })), { path: LESSON, label: shell.nav.boards }];

  for (const { path, label } of pages) {
    test(path, async ({ page }) => {
      await page.goto(path);
      const current = header(page).locator('a[aria-current="page"]');
      await expect(current, `${path}: one current link in the header`).toHaveCount(1);
      await expect(current).toHaveText(label);
    });
  }
});
