import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./support/no-egress";
import { waitForAnimations } from "./support/settled";
import common from "../src/i18n/messages/en/common.json";
import shell from "../src/i18n/messages/en/shell.json";

const style = (locator: Locator, property: "opacity" | "transform") =>
  locator.evaluate((el, name) => getComputedStyle(el)[name], property);

// A finished animation can leave the identity matrix where there is no transform at all.
const NO_MOVE = /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/;

const lastSection = (page: Page) => page.locator("main section[aria-labelledby]").last();

test.describe("with normal motion", () => {
  test("a section below the fold reveals once", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/en/about");
    const section = lastSection(page);
    const content = section.locator("> div").first();
    await expect.poll(() => style(content, "opacity")).toBe("0");

    await section.scrollIntoViewIfNeeded();
    await expect.poll(() => style(content, "opacity")).toBe("1");

    await page.evaluate(() => window.scrollTo(0, 0));
    await waitForAnimations(page);
    expect(await style(content, "opacity")).toBe("1");
  });
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("a section is there at load and does not move", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/en/about");
    const content = lastSection(page).locator("> div").first();
    await expect.poll(() => style(content, "opacity")).toBe("1");
    expect(await style(content, "transform")).toBe("none");
  });

  test("the settings popover and a dialog open without a transform", async ({ page }) => {
    await page.goto("/en");
    const header = page.locator("header:visible").first();
    await header.getByRole("button", { name: shell.settings.label }).click();
    const popover = header.getByRole("dialog", { name: shell.settings.label });
    await expect(popover).toBeVisible();
    await waitForAnimations(page);
    expect(await style(popover, "transform")).toBe("none");

    await popover.getByRole("button", { name: common.client.keys.open }).click();
    const dialog = page.getByRole("dialog", { name: common.client.keys.title });
    await expect(dialog).toBeVisible();
    await waitForAnimations(page);
    expect(await style(dialog, "transform")).toMatch(NO_MOVE);
  });
});
