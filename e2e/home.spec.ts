import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./support/no-egress";
import shell from "../src/i18n/messages/en/shell.json";

const REPO = "https://github.com/kushwahaamar-dev/iynk";
const BANNED = /sign up|pricing|price|sponsor|visitors|users online/i;

test("the home page says what iynk is and what it does not do", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByText(shell.dashboard.lede)).toBeVisible();
  const section = page.getByRole("region", { name: shell.dashboard.openSource.title });
  await expect(section.getByText(shell.dashboard.openSource.fidelity)).toBeVisible();
  const links = {
    [shell.dashboard.openSource.readme]: `${REPO}#readme`,
    [shell.dashboard.openSource.selfHost]: `${REPO}/blob/main/docs/SELF_HOSTING.md`,
    [shell.dashboard.openSource.contribute]: `${REPO}/blob/main/CONTRIBUTING.md`,
  };
  for (const [name, href] of Object.entries(links)) {
    const link = section.getByRole("link", { name });
    await expect(link).toHaveAttribute("href", href);
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }
  await expect(page.getByRole("heading", { name: shell.dashboard.labsTitle })).toBeVisible();
  expect(await page.locator("main").innerText()).not.toMatch(BANNED);
});

test("the home page passes axe and fits a 360 px screen", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
