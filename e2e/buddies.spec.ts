import AxeBuilder from "@axe-core/playwright";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { expect, test } from "./support/no-egress";
import together from "../src/i18n/messages/en/together.json" with { type: "json" };
import { distinctAddress, firstOwnerCode, newEnrolmentCode, serverUrl, stopServer } from "./server-harness";

const b = together.buddies;
const PHONE = { width: 360, height: 800 };

// The tests share the people they create, and the last one stops the server (the config runs this file last).
test.describe.configure({ mode: "serial" });

type Person = { context: BrowserContext; page: Page; throws: string[]; status429: string[] };

async function arrive(browser: Browser, name: string, code: string): Promise<Person> {
  const context = await browser.newContext({ viewport: PHONE });
  await distinctAddress(context);
  const page = await context.newPage();
  const person: Person = { context, page, throws: [], status429: [] };
  page.on("pageerror", (error) => person.throws.push(error.message));
  page.on("response", (res) => res.status() === 429 && person.status429.push(res.url()));
  await page.goto("/en/together");
  await expect(page.getByLabel(b.enrol.code)).toBeVisible();
  await page.getByLabel(b.enrol.code).fill(code);
  await page.getByLabel(b.enrol.name).fill(name);
  await buddies(page).getByRole("button", { name: b.enrol.submit }).click();
  await expect(page.getByText(b.empty.title)).toBeVisible();
  return person;
}

async function openPairing(page: Page): Promise<{ code: string; link: string }> {
  await buddies(page).getByRole("button", { name: b.empty.add }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByTestId("pair-code")).toHaveText(/^[0-9A-Z]{4}-[0-9A-Z]{6}$/);
  return { code: (await dialog.getByTestId("pair-code").textContent()) ?? "", link: await dialog.getByRole("textbox", { name: b.pair.link }).inputValue() };
}

async function enterCode(page: Page, text: string) {
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(b.pair.enterLabel).fill(text);
  await dialog.getByRole("button", { name: b.empty.enter }).click();
}

async function serious(page: Page) {
  // A dialog that is still fading in would fail the contrast rule on colours that are not final.
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== "running"));
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return results.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id);
}

const buddies = (page: Page) => page.getByRole("region", { name: b.title });

const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

let amar: Person;
let mira: Person;
let kai: Person;
let zed: Person;

test.afterAll(async () => {
  await Promise.all([amar, mira, kai, zed].map((person) => person?.context.close()));
});

test("CM-01: both enrol with a code and a name, and no email or password field exists", async ({ browser }) => {
  amar = await arrive(browser, "Amar", firstOwnerCode().code);
  mira = await arrive(browser, "Mira", newEnrolmentCode().code);

  for (const { page } of [amar, mira]) {
    await expect(page.locator('input[type="email"], input[type="password"]')).toHaveCount(0);
    expect(await noSideScroll(page)).toBe(true);
  }
  expect(await serious(amar.page)).toEqual([]);
});

test("a code Amar reads out pairs Mira, and each list shows the other", async () => {
  const { code } = await openPairing(amar.page);
  expect(await serious(amar.page)).toEqual([]);
  expect(await noSideScroll(amar.page)).toBe(true);

  await buddies(mira.page).getByRole("button", { name: b.empty.enter }).click();
  await enterCode(mira.page, code);
  await expect(mira.page.getByText(b.pair.peekFrom.replace("{name}", "Amar"))).toBeVisible();
  await mira.page.getByRole("button", { name: b.pair.accept }).click();
  await expect(mira.page.getByRole("dialog").getByText(b.pair.joined.replace("{name}", "Amar"))).toBeVisible();
  await mira.page.getByRole("dialog").getByRole("button", { name: together.bar.close }).first().click();
  await expect(mira.page.getByRole("dialog")).toHaveCount(0);
  await expect(buddies(mira.page).getByRole("list").getByText("Amar", { exact: true })).toBeVisible();

  await expect(amar.page.getByRole("dialog").getByText(b.pair.joined.replace("{name}", "Mira"))).toBeVisible({ timeout: 10_000 });
  await amar.page.getByRole("dialog").getByRole("button", { name: together.bar.close }).first().click();
  await expect(buddies(amar.page).getByRole("list").getByText("Mira", { exact: true })).toBeVisible();
  expect(await serious(amar.page)).toEqual([]);
  expect(await noSideScroll(amar.page)).toBe(true);
});

test("CM-03: five wrong codes delete the code, the secret then fails and the link still works, with no 429", async ({ browser }) => {
  kai = await arrive(browser, "Kai", newEnrolmentCode().code);
  const { code, link } = await openPairing(amar.page);
  const [channel, secret] = code.split("-");

  await buddies(kai.page).getByRole("button", { name: b.empty.enter }).click();
  const dialog = kai.page.getByRole("dialog");
  for (let i = 0; i < 5; i += 1) {
    const guess = secret === "AAAAA" + i ? "BBBBB" + i : "AAAAA" + i;
    await enterCode(kai.page, `${channel}-${guess}`);
    await expect(dialog.getByRole("alert")).toHaveText(b.pair.wrong);
  }
  await enterCode(kai.page, code);
  await expect(dialog.getByRole("alert")).toHaveText(b.pair.wrong);

  await enterCode(kai.page, link);
  await expect(dialog.getByText(b.pair.peekFrom.replace("{name}", "Amar"))).toBeVisible();
  await dialog.getByRole("button", { name: b.pair.accept }).click();
  await expect(dialog.getByText(b.pair.joined.replace("{name}", "Amar"))).toBeVisible();

  expect(kai.status429).toEqual([]);
  await dialog.getByRole("button", { name: together.bar.close }).first().click();
  await expect(amar.page.getByRole("dialog").getByText(b.pair.joined.replace("{name}", "Kai"))).toBeVisible({ timeout: 10_000 });
  await amar.page.getByRole("dialog").getByRole("button", { name: together.bar.close }).first().click();
  await expect(buddies(amar.page).getByRole("list").getByText("Kai", { exact: true })).toBeVisible();
});

test("CM-06: Amar removes Mira and both lists drop the pair", async () => {
  const row = buddies(amar.page).getByRole("listitem").filter({ hasText: "Mira" });
  await row.getByRole("button", { name: b.list.remove }).click();
  await expect(row.getByText(b.list.removeConfirm.replace("{name}", "Mira"))).toBeVisible();
  await row.getByRole("button", { name: b.list.remove }).click();
  await expect(buddies(amar.page).getByRole("list").getByText("Mira", { exact: true })).toHaveCount(0);

  await mira.page.reload();
  await expect(mira.page.getByText(b.empty.title)).toBeVisible();
});

test("CM-04: someone enrolled but not paired sees an empty list", async ({ browser }) => {
  zed = await arrive(browser, "Zed", newEnrolmentCode().code);

  await expect(buddies(zed.page).getByRole("list")).toHaveCount(0);
  await expect(zed.page.getByText("Amar")).toHaveCount(0);
  expect(await serious(zed.page)).toEqual([]);
});

test("with the server stopped the saved list shows as offline and nothing throws", async () => {
  stopServer();
  const reached = await amar.page.evaluate((url) => fetch(`${url}/v1/server`).then(() => true, () => false), serverUrl());
  expect(reached).toBe(false);
  await amar.page.reload();

  await expect(buddies(amar.page).getByRole("list").getByText("Kai", { exact: true })).toBeVisible();
  await expect(amar.page.getByText(new RegExp(b.unreachable))).toBeVisible();
  await expect(buddies(amar.page).getByRole("button", { name: b.list.remove })).toBeDisabled();
  expect(await noSideScroll(amar.page)).toBe(true);
  expect(await serious(amar.page)).toEqual([]);
  expect(amar.throws).toEqual([]);
});
