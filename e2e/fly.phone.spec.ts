import { expect, test, type Locator, type Page } from "@playwright/test";
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

// The phone cockpit: the mode select ends in an ellipsis inside its own box (Arm never sits on it, armed or not), the
// telemetry is one line above the range rather than over it, and the course hint goes once the craft is armed, so
// the next gate's label and the course stay in view.
test("the phone cockpit leaves the range clear once armed", async ({ page }) => {
  await page.goto("/en/drones/quad5/fly");
  const range = main(page).locator('iframe[src*="/figures/flight/range.html"]');
  await expect(range).toBeVisible({ timeout: 20_000 });
  const select = main(page).getByLabel(flight.mode);
  const arm = main(page).getByRole("button", { name: flight.buttons.arm, exact: true });
  const disarm = main(page).getByRole("button", { name: flight.buttons.disarm, exact: true });
  const box = (l: Locator) => l.evaluate((el) => el.getBoundingClientRect().toJSON() as DOMRect);
  expect(await select.evaluate((el) => getComputedStyle(el).textOverflow)).toBe("ellipsis");
  expect((await box(select)).right).toBeLessThanOrEqual((await box(arm)).left);

  // one line of telemetry, above the range rather than over it
  const strip = await box(main(page).getByTestId("flight-telemetry"));
  expect(strip.bottom).toBeLessThanOrEqual((await box(range)).top + 1);
  expect(strip.height).toBeLessThan(48);

  const hint = main(page).getByText(/^Five gates in order/);
  await expect(hint).toBeVisible();
  // a tap before the page has hydrated does nothing, so tap until it arms
  await expect(async () => {
    if (await arm.isVisible()) await arm.click();
    await expect(disarm).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 30_000 });
  await expect(hint).toBeHidden();
  expect((await box(select)).right).toBeLessThanOrEqual((await box(disarm)).left);
});
