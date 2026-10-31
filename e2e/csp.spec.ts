import type { Page } from "@playwright/test";
import { buildCsp, buildFigureCsp } from "../src/lib/csp";
import { connectOrigins } from "./server-harness";
import { expect, test } from "./support/no-egress";

const PAGES = ["/en", "/en/boards/uno-r3/blink", "/en/robotics/uno-r3-build", "/en/drones/quad5/fly"];
const FIGURE = "/figures/boards/uno-r3.html";

declare global {
  interface Window {
    __violations: string[];
  }
}

/** Records every CSP violation and page error from before the first script runs. */
async function watch(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.__violations = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      window.__violations.push(`${event.violatedDirective} ${event.blockedURI} ${event.sourceFile}:${event.lineNumber}`);
    });
  });
  return async () => ({ violations: await page.evaluate(() => window.__violations), errors });
}

test.describe("page policy", () => {
  for (const path of PAGES) {
    test(`${path} runs with no violation and no page error`, async ({ page }) => {
      const result = await watch(page);
      const response = await page.goto(path);
      expect(response?.headers()["content-security-policy"]).toBe(buildCsp({ dev: false, connectOrigins: connectOrigins() }));
      expect(response?.headers()["content-security-policy"]).toContain("frame-ancestors 'self'");
      await page.waitForLoadState("networkidle");
      expect(await result()).toEqual({ violations: [], errors: [] });
    });
  }

  test("a saved dark theme is applied before the document finishes parsing", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("iynk:v1", JSON.stringify({ settings: { theme: "dark" } }));
      document.addEventListener("DOMContentLoaded", () => {
        window.name = document.documentElement.dataset.theme ?? "";
      });
    });
    await page.goto("/en");
    expect(await page.evaluate(() => window.name)).toBe("dark");
  });
});

test.describe("figure policy", () => {
  test("a figure loads directly under its own policy with no violation", async ({ page }) => {
    const result = await watch(page);
    const response = await page.goto(FIGURE);
    expect(response?.headers()["content-security-policy"]).toBe(buildFigureCsp());
    await page.waitForLoadState("networkidle");
    expect(await result()).toEqual({ violations: [], errors: [] });
  });

  test("a figure frame inside a lesson page reports no violation to the page", async ({ page }) => {
    const result = await watch(page);
    await page.goto("/en/boards/uno-r3/blink");
    await expect(page.locator("iframe[src*='/figures/']").first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(await result()).toEqual({ violations: [], errors: [] });
  });
});
