import { expect, test, type Page } from "@playwright/test";
import flight from "../src/i18n/messages/en/flight.json";

// The fly page on a phone held upright: no sideways scroll, and in the FPV goggles every OSD readout (volts,
// timer, altitude, speed, mode) sits inside the frame instead of off its sides.

const main = (page: Page) => page.locator("main#main-en");

test("the FPV readouts fit a phone in portrait", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/en/drones/quad5/fly");
  const iframe = main(page).locator('iframe[src*="/figures/flight/range.html"]');
  await expect(iframe).toBeVisible({ timeout: 20_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const fpv = main(page).getByRole("button", { name: flight.buttons.fpv, exact: true });
  // a tap before the page has hydrated does nothing, so tap until the goggles are on
  await expect(async () => {
    if ((await fpv.getAttribute("aria-pressed")) !== "true") await fpv.click();
    await expect(fpv).toHaveAttribute("aria-pressed", "true", { timeout: 1000 });
  }).toPass({ timeout: 30_000 });
  await main(page).getByRole("button", { name: flight.buttons.arm, exact: true }).click();
  const range = page.frames().find((f) => f.url().includes("/figures/flight/range.html"))!;
  await expect.poll(() => range.evaluate(() => document.querySelectorAll("#fpv .osd text").length), { timeout: 10_000 }).toBeGreaterThan(4);
  const outside = await range.evaluate(() => {
    const frame = document.getElementById("fpv")!.getBoundingClientRect();
    return [...document.querySelectorAll("#fpv .osd text")]
      .filter((t) => {
        const b = t.getBoundingClientRect();
        return b.width > 0 && (b.left < frame.left - 1 || b.right > frame.right + 1);
      })
      .map((t) => t.textContent);
  });
  expect(outside).toEqual([]);
  expect(errors).toEqual([]);
});
