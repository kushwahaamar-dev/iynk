import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./support/no-egress";
import { waitForAnimations } from "./support/settled";
import { LOCALES } from "../src/i18n/config";

async function seriousViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
}

test("an unknown page inside a language is a branded 404 with the site frame", async ({ page }) => {
  const response = await page.goto("/en/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Back to the dashboard" })).toHaveAttribute("href", "/en");
  await expect(page.getByRole("main").getByRole("button", { name: "Search the site" })).toBeVisible();
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await waitForAnimations(page);
  expect(await seriousViolations(page)).toEqual([]);
});

test("the 404 search button opens the command menu", async ({ page }) => {
  await page.goto("/en/does-not-exist");
  await page.getByRole("main").getByRole("button", { name: "Search the site" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("an unknown page with no language is the global 404 with the six languages", async ({ page }) => {
  const response = await page.goto("/zzz");
  expect(response?.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
  const links = page.getByRole("main").getByRole("link");
  await expect(links).toHaveCount(LOCALES.length);
  for (const locale of LOCALES) await expect(page.locator(`a[href="/${locale}"]`)).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
});

import common from "../src/i18n/messages/en/common.json";

test("robots.txt points at the sitemap", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain("Disallow: /api/");
  expect(body).toMatch(/Sitemap: https?:\/\/[^/\s]+\/sitemap\.xml/);
});

test("sitemap.xml lists pages with hreflang alternates", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain("/en/privacy");
  expect(body).toContain('hreflang="x-default"');
});

test("the manifest parses and has an icon", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.status()).toBe(200);
  const manifest = await response.json();
  expect(manifest.name).toBe(common.site.name);
  expect(manifest.icons.length).toBeGreaterThan(0);
});

test("the home head carries description, sharing tags and a theme color per scheme", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /\S/);
  for (const property of ["og:title", "og:description", "og:image"]) {
    await expect(page.locator(`meta[property="${property}"]`)).toHaveCount(1);
  }
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  await expect(page.locator('meta[name="theme-color"][media="(prefers-color-scheme: light)"]')).toHaveAttribute("content", "#f2efe7");
  await expect(page.locator('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]')).toHaveAttribute("content", "#131209");
});

test("the skip link shows on the first Tab and moves focus to main", async ({ page }) => {
  await page.goto("/en");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: common.a11y.skipToContent });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main-en")).toBeFocused();
});
