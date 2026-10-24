import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { LANG_COOKIE, LOCALES, htmlLang } from "../src/i18n/config";
import common from "../src/i18n/messages/en/common.json";
import commonFr from "../src/i18n/messages/fr/common.json";
import commonZh from "../src/i18n/messages/zh/common.json";
import shell from "../src/i18n/messages/en/shell.json";

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

async function expectNoAxeViolations(page: Page) {
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
  await visibleHeader(page).getByRole("radio", { name: shell.theme.dark }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await visibleHeader(page).getByRole("combobox", { name: shell.language.label }).selectOption("fr");
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

test("the theme choice persists and is applied before the first paint", async ({ page }) => {
  await page.goto("/en");
  await visibleHeader(page).getByRole("radio", { name: shell.theme.dark }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("simlab:v1") ?? "{}").settings?.theme)).toBe("dark");

  await page.addInitScript(() => {
    requestAnimationFrame(() => {
      (window as Window & { firstFrameTheme?: string | null }).firstFrameTheme = document.documentElement.dataset.theme ?? null;
    });
  });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => (window as Window & { firstFrameTheme?: string | null }).firstFrameTheme)).toBe("dark");
  await expect(visibleHeader(page).getByRole("radio", { name: shell.theme.dark })).toHaveAttribute("aria-checked", "true");

  await visibleHeader(page).getByRole("radio", { name: shell.theme.system }).click();
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

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  for (const path of ["/en", "/hi", "/de/no-such-page"]) {
    test(`${path} fits the screen without sideways scrolling`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("main:visible h1").first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

test("the dashboard and the 404 page pass axe", async ({ page }) => {
  await page.goto("/en");
  await expectNoAxeViolations(page);
  await page.goto("/hi/no-such-page");
  await expectNoAxeViolations(page);
});
