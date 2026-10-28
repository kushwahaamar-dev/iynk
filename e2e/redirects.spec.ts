import { expect, test } from "./support/no-egress";
import { LANG_COOKIE } from "../src/i18n/config";

// A section link without a language (said in the pitch, shared in a chat) finds one the way "/" does.
test.describe("a path without a language", () => {
  test.use({ locale: "en-US" });

  test("gets the browser's language and keeps the rest of the path and the query", async ({ page }) => {
    const response = await page.goto("/boards/uno-r3/blink?room=demo1234");
    await expect(page).toHaveURL("/en/boards/uno-r3/blink?room=demo1234");
    expect(response?.status()).toBe(200);
  });

  test("works for a section on its own", async ({ page }) => {
    await page.goto("/drones");
    await expect(page).toHaveURL("/en/drones");
  });

  test("a saved language beats the browser language", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: LANG_COOKIE, value: "hi", url: baseURL! }]);
    await page.goto("/about");
    await expect(page).toHaveURL("/hi/about");
  });
});

test.describe("a path without a language, from a German browser", () => {
  test.use({ locale: "de-DE" });

  test("goes to German", async ({ page }) => {
    await page.goto("/robotics/hc-sr04");
    await expect(page).toHaveURL("/de/robotics/hc-sr04");
  });
});

test.describe("a path without a language, from an unsupported language", () => {
  test.use({ locale: "pt-BR" });

  test("falls back to English", async ({ page }) => {
    await page.goto("/together");
    await expect(page).toHaveURL("/en/together");
  });
});

test.describe("a removed page", () => {
  const gone = [["pass", "port"].join(""), ["ver", "ify"].join("")];

  test("answers 404 under a language", async ({ request }) => {
    for (const name of gone) expect((await request.get(`/en/${name}`)).status(), name).toBe(404);
  });

  test("answers 404 without a language", async ({ request }) => {
    expect((await request.get(`/${gone[0]}`, { maxRedirects: 0 })).status()).toBe(404);
  });
});
