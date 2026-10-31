import { buildCsp, buildFigureCsp } from "../src/lib/csp";
import { connectOrigins } from "./server-harness";
import { expect, test } from "./support/no-egress";

const PAGES = ["/en", "/en/about", "/en/boards/uno-r3/blink", "/en/does-not-exist"];
const OTHERS = ["/config.json", "/api/openapi.json", "/figures/boards/uno-r3.html"];

const EXPECTED = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(self), geolocation=(self), serial=(self), usb=(), payment=()",
  "content-security-policy": buildCsp({ dev: false, connectOrigins: connectOrigins() }),
};

function expectSecurityHeaders(headers: Record<string, string>, csp = EXPECTED["content-security-policy"]) {
  expect(headers).toMatchObject({ ...EXPECTED, "content-security-policy": csp });
  expect(headers["x-powered-by"]).toBeUndefined();
}

test.describe("security headers", () => {
  for (const path of [...PAGES, ...OTHERS]) {
    test(`${path} carries them`, async ({ request }) => {
      const response = await request.get(path);
      expectSecurityHeaders(response.headers(), path.startsWith("/figures/") ? buildFigureCsp() : undefined);
    });
  }

  test("a static asset carries them", async ({ page, request }) => {
    await page.goto("/en");
    const src = await page.locator("script[src*='/_next/static/']").first().getAttribute("src");
    expect(src).toBeTruthy();
    expectSecurityHeaders((await request.get(src!)).headers());
  });

  test("figures keep their own cache rule", async ({ request }) => {
    const response = await request.get("/figures/boards/uno-r3.html");
    expect(response.headers()["cache-control"]).toBe("public, max-age=300, must-revalidate");
  });
});
