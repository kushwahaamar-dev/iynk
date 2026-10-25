import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import flight from "../src/i18n/messages/en/flight.json";

// The fly page of every craft (src/lib/flight/registry.ts flies them all from their content): the range opens on the
// craft's first course, the autopilot demo arms, takes off and passes the course's first gate or checkpoint,
// on the same physics the learner flies. A craft whose content or English prose has not landed yet is skipped.

// wave A's eight, then wave B's five: each runs as soon as its content and English prose land
const CRAFTS = ["quad5", "whoop", "cinewhoop", "longrange", "wing", "racer", "gpscam", "delivery", "agrihex", "swarm", "vtol", "tricopter", "octo"];

const landed = (id: string) => existsSync(`src/content/drones/${id}.ts`) && existsSync(`src/i18n/content/en/drones/${id}.json`);

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /hydrat|did not match|Minified React error/i.test(message.text())) errors.push(message.text());
  });
  return errors;
}

const main = (page: Page) => page.locator("main#main-en");

for (const id of CRAFTS) {
  test(`${id}: the demo arms, takes off and passes the first gate or checkpoint`, async ({ page }) => {
    test.skip(!landed(id), `${id} has no content module or English prose yet`);
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    const response = await page.goto(`/en/drones/${id}/fly`);
    expect(response?.status()).toBe(200);
    await expect(main(page).getByRole("heading", { level: 1 })).toContainText("Fly the");
    await expect(main(page).locator('iframe[src*="/figures/flight/range.html"]')).toBeVisible({ timeout: 20_000 });

    const mode = main(page).getByLabel(flight.mode);
    // a pick made before the page has hydrated is put back by React, so pick until the page answers
    await expect(async () => {
      await mode.selectOption("demo");
      await expect(main(page).getByText(flight.demoHint)).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 30_000 });
    await main(page).getByRole("button", { name: flight.buttons.arm, exact: true }).click();
    const message = main(page).getByTestId("flight-message");
    await expect(message).toContainText(flight.msg.hintDemo);
    // a gate ("Gate 1 of 5") or a checkpoint ("THE GAP done"): the craft is off the ground and on the course
    await expect(message).toHaveText(/Gate \d+ of \d+|done/, { timeout: 90_000 });
    await expect(main(page).getByRole("button", { name: flight.buttons.disarm, exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("every course is listed with its medal times, and picking one flies it", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/en/drones/quad5/fly");
  const courses = main(page).getByRole("list").filter({ has: page.getByRole("button", { pressed: true }) });
  await expect(courses.getByText(/^Gold 10 s · silver 14 s · bronze 20 s$/)).toBeVisible();
  await expect(courses.getByText(/^Gold 25 s · silver 32 s · bronze 45 s$/)).toBeVisible();
  const mode = main(page).getByLabel(flight.mode);
  // the gate race opens in the race mode, the bando run in the range mode
  await expect(mode).toHaveValue("race");
  await expect(async () => {
    await courses.getByRole("button", { name: /bando/i }).click();
    await expect(mode).toHaveValue("range", { timeout: 1000 });
  }).toPass({ timeout: 30_000 });
  // the medal times sit on each course row; the picked course is the pressed one
  await expect(courses.getByRole("button", { name: /bando/i })).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});

test("the cockpit passes axe", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/en/drones/quad5/fly");
  await expect(main(page).locator('iframe[src*="/figures/flight/range.html"]')).toBeVisible({ timeout: 20_000 });
  await expect(main(page).getByTestId("flight-telemetry")).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  expect(errors).toEqual([]);
});
