import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./support/no-egress";
import studio from "../src/i18n/messages/en/studio.json";

// The bare project list: create, reload, duplicate, delete and restore, the warning when the browser keeps
// nothing, and axe. Everything stays on the app's own origin.

const list = (page: Page) => page.getByTestId("project-list");

async function openStudio(page: Page) {
  await page.goto("/en/studio");
  await expect(page.getByRole("button", { name: studio.newProject })).toBeVisible({ timeout: 15_000 });
}

async function addProject(page: Page) {
  await page.getByRole("button", { name: studio.newProject }).click();
  await expect(list(page).getByRole("row", { name: new RegExp(studio.newName) })).toBeVisible();
}

test.describe("project list", () => {
  test("makes no request outside the app origin", async ({ page, baseURL }) => {
    const origin = new URL(baseURL ?? "http://localhost").origin;
    const foreign: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (/^https?:$/.test(url.protocol) && url.origin !== origin) foreign.push(url.origin);
    });
    await openStudio(page);
    await addProject(page);
    expect(foreign).toEqual([]);
  });

  test("a new project is still listed after a reload", async ({ page }) => {
    await openStudio(page);
    const started = Date.now();
    await expect(page.getByText(studio.list.emptyTitle)).toBeVisible();
    console.log(`first list ${Date.now() - started} ms after the page was usable`);

    await addProject(page);
    const row = list(page).getByRole("row", { name: new RegExp(studio.newName) });
    await expect(row).toContainText(studio.board.unoR3);

    await page.reload();
    await expect(list(page).getByRole("row", { name: new RegExp(studio.newName) })).toBeVisible({ timeout: 15_000 });
  });

  test("duplicate, delete and restore", async ({ page }) => {
    await openStudio(page);
    await addProject(page);

    await page.getByRole("button", { name: "Duplicate Blink" }).click();
    await expect(page.getByRole("button", { name: "Open Copy of Blink" })).toBeVisible();

    await page.getByRole("button", { name: "Delete Copy of Blink" }).click();
    await expect(page.getByRole("button", { name: "Open Copy of Blink" })).toHaveCount(0);
    await page.getByRole("button", { name: "Restore Copy of Blink" }).click();
    await expect(page.getByRole("button", { name: "Open Copy of Blink" })).toBeVisible();
  });

  test("opens a project and shows its revision and hash", async ({ page }) => {
    await openStudio(page);
    await addProject(page);
    await page.getByRole("button", { name: "Open Blink" }).click();
    const panel = page.getByRole("region", { name: studio.selected.title });
    await expect(panel).toContainText(studio.selected.revision);
    await expect(panel.getByText(/^[0-9a-f]{8}$/)).toBeVisible();
  });

  test("warns when the browser keeps nothing, and New still works", async ({ page }) => {
    // A dedicated worker has its own indexedDB, so the page-level switch alone would leave the worker untouched.
    await page.context().route(/turbopack-worker[^/]*\.js$/, async (route) => {
      const response = await route.fetch();
      const body = await response.text();
      await route.fulfill({ response, body: `Object.defineProperty(self, "indexedDB", { value: undefined });\n${body}` });
    });
    await page.addInitScript(() => {
      Object.defineProperty(window, "indexedDB", { value: undefined });
    });
    await openStudio(page);
    await addProject(page);
    await expect(page.getByText(studio.banner.degradedTitle)).toBeVisible();
  });

  test("passes axe with a project present", async ({ page }) => {
    await openStudio(page);
    await addProject(page);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
});
