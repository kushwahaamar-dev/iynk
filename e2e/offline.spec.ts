import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "./support/no-egress";
import studio from "../src/i18n/messages/en/studio.json";

// After one online visit and a reload under the worker, the list loads with no network at all.

const distDir = process.env.NEXT_DIST_DIR ?? ".next-e2e";

test("the project list reloads offline and the worker keeps server paths out of its caches", async ({ page, context }) => {
  await page.addInitScript(() => {
    const seen: string[] = [];
    Object.assign(window, { __csp: seen });
    document.addEventListener("securitypolicyviolation", (event) => seen.push(event.violatedDirective));
  });

  await page.goto("/en/studio");
  await expect(page.getByRole("button", { name: studio.newProject })).toBeVisible({ timeout: 15_000 });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.getByRole("button", { name: studio.newProject })).toBeVisible({ timeout: 15_000 });
  expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  await page.evaluate(() => fetch("/v1/anything").catch(() => null));

  const failed: string[] = [];
  page.on("requestfailed", (request) => failed.push(request.url()));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: studio.title })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: studio.newProject })).toBeVisible({ timeout: 15_000 });
  const origin = new URL(page.url()).origin;
  expect(failed.filter((url) => url.startsWith(origin))).toEqual([]);
  await context.setOffline(false);

  const caches = await page.evaluate(async () => {
    const names = await window.caches.keys();
    const urls: string[] = [];
    for (const name of names) for (const request of await (await window.caches.open(name)).keys()) urls.push(new URL(request.url).pathname);
    return { names, urls };
  });
  expect(caches.urls.filter((path) => path.startsWith("/v1/") || path.startsWith("/api/"))).toEqual([]);
  expect(caches.names).toContain("iynk-engines-v1");

  const buildId = readFileSync(join(distDir, "BUILD_ID"), "utf8").trim();
  const scriptUrl = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.scriptURL ?? "");
  expect(new URL(scriptUrl).searchParams.get("v")).toBe(buildId);
  expect(caches.names).toContain(`iynk-shell-${buildId}`);
  expect(caches.names).toContain(`iynk-static-${buildId}`);
  expect(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)).toEqual([]);
});

test("the worker is served uncached with its own policy", async ({ request }) => {
  const response = await request.get("/sw.js?v=probe");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-cache, no-store, must-revalidate");
  expect(response.headers()["content-security-policy"]).toBe("default-src 'self'; script-src 'self'");
  expect(response.headers()["content-type"]).toContain("javascript");
});
