import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./support/no-egress";
import { waitForAnimations } from "./support/settled";
import { LOCALES } from "../src/i18n/config";
import home from "../src/i18n/messages/en/home.json";

const REPO = "https://github.com/kushwahaamar-dev/iynk";
const BANNED = /sign up|pricing|price|sponsor|visitors|users online/i;

test("the home page says what iynk is and what it does not do", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByText(home.hero.lede)).toBeVisible();
  const section = page.getByRole("region", { name: home.open.title });
  const links = {
    [home.open.readme]: `${REPO}#readme`,
    [home.open.selfHost]: `${REPO}/blob/main/docs/SELF_HOSTING.md`,
    [home.open.contribute]: `${REPO}/blob/main/CONTRIBUTING.md`,
  };
  for (const [name, href] of Object.entries(links)) {
    const link = section.getByRole("link", { name });
    await expect(link).toHaveAttribute("href", href);
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }
  await expect(page.getByText(home.proof.fidelity)).toBeVisible();
  await expect(page.getByRole("heading", { name: home.labs.title })).toBeVisible();
  expect(await page.locator("main").innerText()).not.toMatch(BANNED);
});

test("the home page has its sections in order and one primary action above the fold", async ({ page }) => {
  await page.goto("/en");
  const headings = await page.locator("main h1, main h2").allInnerTexts();
  const titles = [home.labs.title, home.benefits.title, home.how.title, home.proof.title, home.faq.title, home.open.title, home.end.title];
  expect(headings.map((text) => text.trim()).filter((text) => titles.includes(text))).toEqual(titles);
  await expect(page.getByRole("link", { name: home.hero.cta }).first()).toBeInViewport();
  await expect(page.locator("main").getByRole("link", { name: home.hero.cta })).toHaveCount(2);
  await expect(page).toHaveTitle(home.meta.title);
});

test("the tagline lights up word by word as it is scrolled to", async ({ page }) => {
  await page.goto("/en");
  const words = page.locator("[data-word]");
  const total = await words.count();
  expect(total).toBeGreaterThan(10);
  await expect(page.locator('[data-word][data-lit="true"]')).toHaveCount(0);
  await words.last().scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 400);
  await expect(page.locator('[data-word][data-lit="true"]')).toHaveCount(total);
});

test("the questions are also published as FAQPage data", async ({ page }) => {
  await page.goto("/en");
  const json = await page.locator('script[type="application/ld+json"]').first().textContent();
  const data = JSON.parse(json ?? "{}");
  expect(data["@type"]).toBe("FAQPage");
  expect(data.mainEntity).toHaveLength(8);
  expect(data.mainEntity[0].name).toBe(home.faq["1"].q);
});

for (const lang of LOCALES) {
  test(`the ${lang} home page opens without a page error`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/${lang}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("main h2")).toHaveCount(7);
    expect(errors).toEqual([]);
  });
}

test("the home page passes axe and fits a 360 px screen", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await waitForAnimations(page);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
