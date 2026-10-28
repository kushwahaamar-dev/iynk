import { expect, test } from "./support/no-egress";

const PAGES = ["/en", "/en/about", "/en/boards/uno-r3/blink", "/en/does-not-exist"];
const OTHERS = ["/api/status", "/api/openapi.json", "/figures/boards/uno-r3.html"];

const EXPECTED = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(self), geolocation=(self), serial=(self), usb=(), payment=()",
  "content-security-policy": "frame-ancestors 'self'",
};

function expectSecurityHeaders(headers: Record<string, string>) {
  expect(headers).toMatchObject(EXPECTED);
  expect(headers["x-powered-by"]).toBeUndefined();
}

test.describe("security headers", () => {
  for (const path of [...PAGES, ...OTHERS]) {
    test(`${path} carries them`, async ({ request }) => {
      const response = await request.get(path);
      expectSecurityHeaders(response.headers());
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
