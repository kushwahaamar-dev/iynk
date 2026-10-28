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
