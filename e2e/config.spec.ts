import { expect, test } from "./support/no-egress";

test("the page asks /config.json for its capabilities and never /api/status", async ({ page }) => {
  const paths: string[] = [];
  page.on("request", (request) => paths.push(new URL(request.url()).pathname));
  await page.goto("/en/together");
  await expect.poll(() => paths).toContain("/config.json");
  expect(paths).not.toContain("/api/status");
});
