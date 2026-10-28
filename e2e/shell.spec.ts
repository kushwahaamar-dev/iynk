import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./support/no-egress";
import { waitForAnimations } from "./support/settled";
import { LANG_COOKIE, LOCALES, htmlLang } from "../src/i18n/config";
import common from "../src/i18n/messages/en/common.json";
import commonFr from "../src/i18n/messages/fr/common.json";
import commonZh from "../src/i18n/messages/zh/common.json";
import shell from "../src/i18n/messages/en/shell.json";
import together from "../src/i18n/messages/en/together.json";

const CANARY_KEY = "iynk-canary-KEY-0001-do-not-use";

// Uncaught errors and React hydration problems; other console noise (a figure
// still being built, say) belongs to the tests of the page that owns it.
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /hydrat|did not match|Minified React error/i.test(message.text())) {
      errors.push(message.text());
    }
  });
  return errors;
}

// Activity keeps hidden copies of earlier pages, so look only at what shows.
const visibleHeader = (page: Page) => page.locator("header:visible").first();

// Theme, language, sound, motion and usage counts sit in the header's Settings popover.
async function openSettings(page: Page, label = shell.settings.label) {
  const button = visibleHeader(page).getByRole("button", { name: label });
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  const panel = visibleHeader(page).getByRole("dialog", { name: label });
  await expect(panel).toBeVisible();
  return panel;
}

// The theme options whose words don't fit their pill, or that the row hides by scrolling.
function cutThemeOptions(page: Page) {
  return page.evaluate(() => {
    const group = [...document.querySelectorAll('[role="dialog"] [role="radiogroup"]')].find((g) => (g as HTMLElement).offsetParent !== null);
    if (!group) return ["no theme control"];
    const box = group.getBoundingClientRect();
    return [...group.querySelectorAll('[role="radio"]')].flatMap((radio) => {
      const pill = radio.getBoundingClientRect();
      const words = (radio.querySelector("span") ?? radio).getBoundingClientRect();
      const cut = words.right > pill.right + 0.5 || words.left < pill.left - 0.5 || pill.right > box.right + 0.5 || pill.left < box.left - 0.5;
      return cut ? [radio.textContent ?? ""] : [];
    });
  });
}

async function expectNoAxeViolations(page: Page) {
  // Axe reads the blended colour of a block that is still fading in, so let the entrance animations finish first.
  await waitForAnimations(page);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect(summary).toEqual([]);
}

for (const locale of LOCALES) {
  test(`the ${locale} dashboard renders in its language`, async ({ page }) => {
    const errors = watchErrors(page);
    const response = await page.goto(`/${locale}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", htmlLang(locale));
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator(`main#main-${locale} h1`).first()).toBeVisible();
    // Every page carries canonical and hreflang links for all six languages.
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(LOCALES.length + 1);
    expect(errors).toEqual([]);
  });
}

test("the skip link is the first stop and lands on the main content", async ({ page }) => {
  await page.goto("/en");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: common.a11y.skipToContent });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main-en")).toBeFocused();
});

test("a page that calls out fails the test", async ({ page }) => {
  test.fail();
  await page.goto("/");
  await page.evaluate(() => fetch("https://example.com").catch(() => null));
});

test.describe("the / redirect", () => {
  test.describe("from a German browser", () => {
    test.use({ locale: "de-DE" });
    test("goes to the browser language and keeps the query", async ({ page }) => {
      await page.goto("/?ref=hacktx");
      await expect(page).toHaveURL("/de?ref=hacktx");
    });
    test("a saved language beats the browser language", async ({ page, context, baseURL }) => {
      await context.addCookies([{ name: LANG_COOKIE, value: "hi", url: baseURL! }]);
      await page.goto("/");
      await expect(page).toHaveURL("/hi");
    });
  });

  test.describe("from a browser in an unsupported language", () => {
    test.use({ locale: "pt-BR" });
    test("falls back to English", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL("/en");
    });
  });
});

test("switching language keeps the path, saves the choice and keeps the theme", async ({ page, context }) => {
  const errors = watchErrors(page);
  await page.goto("/en/no/such/page");
  const settings = await openSettings(page);
  await settings.getByRole("radio", { name: shell.theme.dark }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await settings.getByRole("combobox", { name: shell.language.label }).selectOption("fr");
  await expect(page).toHaveURL("/fr/no/such/page");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  // The new layout's <html> starts without data-theme; SettingsSync restores it.
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("heading", { name: commonFr.notFound.title })).toBeVisible();
  expect((await context.cookies()).find((cookie) => cookie.name === LANG_COOKIE)?.value).toBe("fr");

  await page.goto("/");
  await expect(page).toHaveURL("/fr");
  expect(errors).toEqual([]);
});

test("a first visit is light from the first frame, even on a dark OS", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => {
    requestAnimationFrame(() => {
      (window as Window & { firstFrameTheme?: string | null }).firstFrameTheme = document.documentElement.dataset.theme ?? null;
    });
  });
  await page.goto("/en");
  expect(await page.evaluate(() => (window as Window & { firstFrameTheme?: string | null }).firstFrameTheme)).toBe("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("light");
  await expect((await openSettings(page)).getByRole("radio", { name: shell.theme.light })).toHaveAttribute("aria-checked", "true");
});

test("the theme choice persists and is applied before the first paint", async ({ page }) => {
  await page.goto("/en");
  await (await openSettings(page)).getByRole("radio", { name: shell.theme.dark }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("iynk:v1") ?? "{}").settings?.theme)).toBe("dark");

  await page.addInitScript(() => {
    requestAnimationFrame(() => {
      (window as Window & { firstFrameTheme?: string | null }).firstFrameTheme = document.documentElement.dataset.theme ?? null;
    });
  });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => (window as Window & { firstFrameTheme?: string | null }).firstFrameTheme)).toBe("dark");
  const settings = await openSettings(page);
  await expect(settings.getByRole("radio", { name: shell.theme.dark })).toHaveAttribute("aria-checked", "true");

  await settings.getByRole("radio", { name: shell.theme.system }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
});

test("an unknown URL is a real 404 inside the localized layout", async ({ page }) => {
  const response = await page.goto("/zh/boards/no-such-board/deeper");
  expect(response?.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");
  await expect(page.getByRole("heading", { level: 1, name: commonZh.notFound.title })).toBeVisible();
  await expect(page).toHaveTitle(new RegExp(commonZh.notFound.metaTitle));
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  await expect(page.locator("header:visible")).toHaveCount(1);
  await expect(page.locator("footer:visible")).toHaveCount(1);
});

for (const locale of LOCALES) {
  test(`the ${locale} theme options read in full in the Settings popover`, async ({ page }) => {
    const { default: messages } = await import(`../src/i18n/messages/${locale}/shell.json`, { with: { type: "json" } });
    await page.goto(`/${locale}`);
    await openSettings(page, messages.settings.label);
    expect(await cutThemeOptions(page)).toEqual([]);
  });
}

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  for (const locale of ["en", "fr"] as const) {
    test(`the ${locale} menu reads in full and shows no tooltip on its close button`, async ({ page }) => {
      await page.goto(`/${locale}`);
      await visibleHeader(page).locator('button[aria-haspopup="dialog"]:visible').first().tap();
      await expect(page.getByRole("dialog").first()).toBeVisible();
      expect(await cutThemeOptions(page)).toEqual([]);
      // Opening the menu moves focus to its close button; a touch screen has no hover to take a tip away again.
      await expect(page.getByRole("tooltip")).toHaveCount(0);
    });
  }

  test("the Keys and usage button in the menu drawer opens the dialog over it and Escape closes the dialog", async ({ page }) => {
    await page.goto("/en");
    await visibleHeader(page).locator('button[aria-haspopup="dialog"]:visible').first().tap();
    const drawer = page.getByRole("dialog").first();
    await drawer.getByRole("button", { name: common.client.keys.open }).tap();
    const dialog = page.getByRole("dialog", { name: common.client.keys.title });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(":focus")).toHaveCount(1);
    await expectNoAxeViolations(page);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("button", { name: common.client.keys.open })).toBeFocused();
  });

  for (const path of ["/en", "/hi", "/de/no-such-page"]) {
    test(`${path} fits the screen without sideways scrolling`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("main:visible h1").first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

test("Settings opens from the header, closes with Escape and hands focus back", async ({ page }) => {
  await page.goto("/en");
  const panel = await openSettings(page);
  await expect(panel.getByRole("switch", { name: common.client.sound.label })).toBeVisible();
  await expect(panel.getByRole("switch", { name: common.client.motion.label })).toBeVisible();
  await expect(panel.getByTestId("usage-toggle")).toBeVisible();
  await panel.getByRole("switch", { name: common.client.motion.label }).click();
  await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "true");
  await expectNoAxeViolations(page);
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(visibleHeader(page).getByRole("button", { name: shell.settings.label })).toBeFocused();
});

test("the Keys and usage dialog opens from Settings, passes axe, closes with Escape and hands focus back", async ({ page }) => {
  await page.goto("/en");
  const settings = visibleHeader(page).getByRole("button", { name: shell.settings.label });
  const panel = await openSettings(page);
  await panel.getByRole("button", { name: common.client.keys.open }).click();
  const dialog = page.getByRole("dialog", { name: common.client.keys.title });
  await expect(dialog).toBeVisible();
  await expect(panel).toBeHidden();
  await expect(dialog.locator(":focus")).toHaveCount(1);
  await expectNoAxeViolations(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(settings).toBeFocused();
});

test("a pasted key shows only its tail and goes when removed", async ({ page }) => {
  await page.goto("/en");
  const keys = common.client.keys;
  await (await openSettings(page)).getByRole("button", { name: keys.open }).click();
  const dialog = page.getByRole("dialog", { name: keys.title });
  await dialog.getByLabel(keys.ai.label, { exact: true }).fill(CANARY_KEY);
  await dialog.getByRole("button", { name: `${keys.save}: ${keys.ai.label}` }).click();
  await expect(dialog.getByText("…-use")).toBeVisible();
  await expect(dialog.getByRole("button", { name: `${keys.remove}: ${keys.ai.label}` })).toBeFocused();
  expect(await dialog.innerText()).not.toContain(CANARY_KEY);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("iynk:keys:v1") ?? "{}").ai?.key)).toBe(CANARY_KEY);
  await dialog.getByRole("button", { name: `${keys.remove}: ${keys.ai.label}` }).click();
  await expect(dialog.getByLabel(keys.ai.label, { exact: true })).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem("iynk:keys:v1"))).toBeNull();
});

test("the Keys and usage dialog shows what the server counted for a saved key", async ({ page }) => {
  const keys = common.client.keys;
  let requests = 0;
  await page.route("**/api/usage?kind=*", async (route) => {
    requests += 1;
    await route.fulfill({
      json: { kind: "ai", today: { tokens: 12400, requests: 3 }, monthTotal: { tokens: 80000, requests: 9 }, cap: 200000 },
    });
  });
  await page.goto("/en");
  await (await openSettings(page)).getByRole("button", { name: keys.open }).click();
  const dialog = page.getByRole("dialog", { name: keys.title });
  await expect(dialog.getByText(common.client.meter.noKey).first()).toBeVisible();
  expect(requests).toBe(0);
  await dialog.getByLabel(keys.ai.label, { exact: true }).fill(CANARY_KEY);
  await dialog.getByRole("button", { name: `${keys.save}: ${keys.ai.label}` }).click();
  await expect(dialog.getByText("12,400 of 200,000")).toBeVisible();
  await expect(dialog.getByText("This month: 80,000 tokens.")).toBeVisible();
  await expectNoAxeViolations(page);
});

test("the dashboard and the 404 page pass axe", async ({ page }) => {
  await page.goto("/en");
  await expectNoAxeViolations(page);
  await page.goto("/hi/no-such-page");
  await expectNoAxeViolations(page);
});

test("About opens with its title, not a kicker that repeats it", async ({ page }) => {
  await page.goto("/en/about");
  const header = page.locator("main:visible header").first();
  await expect(header.getByRole("heading", { level: 1, name: shell.about.title })).toBeVisible();
  await expect(header.locator(".ink-kicker")).toHaveCount(0);
});

test("without the AI service, the Together lede doesn't promise translated chat", async ({ page }) => {
  // The test server has no AI key, so the lobby lede leaves out the translated-chat promise.
  await page.goto("/en/together");
  await expect(page.getByText(together.lobby.ledePlain)).toBeVisible();
  await expect(page.getByText(together.lobby.lede)).toHaveCount(0);
});

test.describe("the floating nav bar", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("floats 8 px off the top, is centred and is narrower than the page", async ({ page }) => {
    await page.goto("/en");
    const box = await visibleHeader(page).getByRole("link", { name: shell.brand.home }).evaluate((link) => {
      const rect = (link.parentElement as HTMLElement).getBoundingClientRect();
      return { top: rect.top, width: rect.width, centre: rect.left + rect.width / 2, viewport: document.documentElement.clientWidth };
    });
    expect(box.top).toBe(8);
    expect(box.width).toBeLessThan(1200);
    expect(Math.abs(box.centre - box.viewport / 2)).toBeLessThanOrEqual(1);
    await expect(page.locator("body > header:visible")).toHaveCount(1);
  });
});

test.describe("the nav bar in German at 1024 px", () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test("keeps the links on one row", async ({ page }) => {
    await page.goto("/de");
    const tops = await visibleHeader(page)
      .getByRole("navigation")
      .getByRole("link")
      .evaluateAll((links) => links.map((link) => Math.round(link.getBoundingClientRect().top)));
    expect(tops.length).toBeGreaterThan(1);
    expect(new Set(tops).size).toBe(1);
  });
});

test("the footer opens the privacy page, which passes axe", async ({ page }) => {
  await page.goto("/en");
  await page.locator("footer:visible").getByRole("link", { name: shell.footer.privacyLink }).click();
  await expect(page).toHaveURL(/\/en\/privacy$/);
  await expect(page.getByRole("heading", { level: 1, name: shell.privacy.title })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("the Hindi privacy page renders in Devanagari", async ({ page }) => {
  await page.goto("/hi/privacy");
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveText(/[ऀ-ॿ]/);
});
