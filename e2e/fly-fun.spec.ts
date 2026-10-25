import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import data from "../src/components/data/messages/en.json";
import flight from "../src/i18n/messages/en/flight.json";
import together from "../src/i18n/messages/en/together.json";
import { dockCopy, openDock } from "./dock-shared";

// The fly page's fun (BUILD-PLAN §3.2 item 8): a friend's craft flies beside you as a ghost, a crash replays in slow
// motion and says why, and a daily challenge link opens the day's course. Rooms run on the one-browser fallback
// (a BroadcastChannel), so the two screens are two tabs of one context, as in room.spec.ts.

const ANA = { v: 1, name: "Ana", color: "#ef6a4c" };
const main = (page: Page) => page.locator("main#main-en");
// a client-side move to another craft keeps the page it left in the tree, hidden
const challengeCard = (page: Page) => main(page).locator('[data-testid="daily-challenge"]:visible');
const range = (page: Page) => page.frameLocator('iframe[src*="/figures/flight/range.html"]');
const fill = (template: string, params: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, k: string) => params[k] ?? "");

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /hydrat|did not match|Minified React error/i.test(message.text())) errors.push(message.text());
  });
  return errors;
}

async function seedIdentity(context: BrowserContext) {
  await context.addInitScript((identity) => {
    if (!localStorage.getItem("simlab:together:v1")) localStorage.setItem("simlab:together:v1", JSON.stringify(identity));
  }, ANA);
}

async function openFly(page: Page, url: string) {
  expect((await page.goto(url))?.status()).toBe(200);
  await expect(main(page).locator('iframe[src*="/figures/flight/range.html"]')).toBeVisible({ timeout: 20_000 });
}

/** Picks a mode; a pick made before the page has hydrated is put back by React, so pick until it holds. */
async function pickMode(page: Page, mode: string) {
  const select = main(page).getByLabel(flight.mode);
  await expect(async () => {
    await select.selectOption(mode);
    await expect(select).toHaveValue(mode, { timeout: 1000 });
  }).toPass({ timeout: 30_000 });
}

test("a friend's craft flies a lap beside you as a ghost with their name", async ({ context }) => {
  test.setTimeout(120_000);
  await seedIdentity(context);
  const a = await context.newPage();
  const errorsA = watchErrors(a);
  await openFly(a, "/en/drones/quad5/fly");
  const dockA = await openDock(a, false);
  await dockA.getByRole("tab", { name: dockCopy.tabs.together }).click();
  await dockA.getByRole("button", { name: together.panel.start }).click();
  await expect(a).toHaveURL(/[?&]room=[a-z0-9]{6}/);

  const b = await context.newPage();
  const errorsB = watchErrors(b);
  await openFly(b, a.url());
  const dockB = await openDock(b, false);
  const two = fill(together.bar.people.other, { count: "2" });
  await expect(dockB.getByText(two)).toBeVisible({ timeout: 15_000 });
  await expect(dockA.getByText(two)).toBeVisible();

  // B waits on the pad, with the autopilot's line parked at the start gate until B's lap starts
  await expect(range(b).locator("#overlay .glabel", { hasText: flight.ghosts.labelPace })).toBeVisible({ timeout: 15_000 });
  await expect(range(b).locator("#overlay .glabel", { hasText: ANA.name })).toHaveCount(0);

  // A hands the race to the autopilot and takes off from the pad beside B
  await a.bringToFront();
  await pickMode(a, "demo");
  await main(a).getByRole("button", { name: flight.buttons.arm, exact: true }).click();

  // on B's range: a ghost craft with A's name tag, and it moves
  await expect(range(b).locator("#overlay .glabel", { hasText: ANA.name })).toBeVisible({ timeout: 15_000 });
  const ghost = range(b).locator("#iso .ghostcraft");
  await expect(ghost).toHaveCount(2);
  const before = await ghost.evaluateAll((gs) => gs.map((g) => g.innerHTML).join("|"));
  await expect.poll(() => ghost.evaluateAll((gs) => gs.map((g) => g.innerHTML).join("|")), { timeout: 10_000 }).not.toBe(before);
  await expect(main(a).getByTestId("flight-message")).toHaveText(/Gate \d+ of \d+/, { timeout: 60_000 });
  expect(errorsA).toEqual([]);
  expect(errorsB).toEqual([]);
});

test("break it: a backwards flight controller flips, the crash replays in slow motion, says why and fixes in one click", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await openFly(page, "/en/drones/quad5/fly");
  const breakIt = main(page).getByTestId("break-it");
  const fc = breakIt.getByRole("switch", { name: flight.breakIt.items.fcReversed.label });
  await expect(async () => {
    if ((await fc.getAttribute("aria-checked")) !== "true") await fc.click();
    await expect(fc).toHaveAttribute("aria-checked", "true", { timeout: 1000 });
  }).toPass({ timeout: 30_000 });
  await expect(breakIt.getByText(flight.breakIt.noBoard)).toBeVisible();

  await pickMode(page, "demo");
  await main(page).getByRole("button", { name: flight.buttons.arm, exact: true }).click();
  const why = main(page).getByTestId("crash-why");
  await expect(why).toBeVisible({ timeout: 20_000 });
  await expect(why).toHaveAttribute("data-cause", "flipFc");
  await expect(why).toContainText("mounted backwards");
  // the replay plays in the range with its badge, then the button offers it again
  await expect(range(page).locator("#badge")).toBeVisible();
  await expect(range(page).locator("#badge")).toHaveText(flight.why.badge);
  await expect(main(page).getByTestId("crash-replay")).toHaveAttribute("data-playing", "false", { timeout: 20_000 });
  await expect(range(page).locator("#badge")).toBeHidden();
  await main(page).getByTestId("crash-replay").click();
  await expect(range(page).locator("#badge")).toBeVisible();

  await why.getByRole("button", { name: flight.why.fix.fcReversed }).click();
  await expect(why).toBeHidden();
  await expect(fc).toHaveAttribute("aria-checked", "false");
  await expect(main(page).getByTestId("flight-message")).toHaveText(fill(flight.why.fixed, { fix: flight.why.fix.fcReversed }));
  // fixed, the demo flies the course
  await main(page).getByRole("button", { name: flight.buttons.arm, exact: true }).click();
  await expect(main(page).getByTestId("flight-message")).toHaveText(/Gate \d+ of \d+/, { timeout: 60_000 });
  await expect(why).toBeHidden();
  expect(errors).toEqual([]);
});

test("a daily challenge link opens the day's craft and course, with the time to beat", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await openFly(page, "/en/drones/quad5/fly");
  const card = challengeCard(page);
  await expect(card).toBeVisible({ timeout: 20_000 });
  const craft = (await card.getAttribute("data-craft"))!;
  const course = (await card.getAttribute("data-course"))!;
  const date = (await card.getAttribute("data-date"))!;
  expect(date).toBe(new Date().toISOString().slice(0, 10));

  // the card goes to the day's craft (or starts it here), and the range opens on the day's course
  const go = card.getByTestId(craft === "quad5" ? "challenge-fly" : "challenge-go");
  await expect(async () => {
    await go.click();
    await expect(challengeCard(page)).toHaveAttribute("data-active", "true", { timeout: 2000 });
  }).toPass({ timeout: 30_000 });
  await expect(page).toHaveURL(new RegExp(`/en/drones/${craft}/fly`));
  await expect(main(page).locator('[data-testid="flight-range"]:visible')).toHaveAttribute("data-course", course);

  // the share link carries the day; opened fresh with a time to beat, it lands on the same course
  const href = (await challengeCard(page).getByTestId("challenge-link").getAttribute("href"))!;
  expect(href).toBe(`/en/drones/${craft}/fly?challenge=${date}`);
  await openFly(page, `${href}&beat=12.34&by=Ana`);
  const shared = challengeCard(page);
  await expect(shared).toHaveAttribute("data-active", "true", { timeout: 20_000 });
  await expect(shared).toHaveAttribute("data-course", course);
  await expect(main(page).locator('[data-testid="flight-range"]:visible')).toHaveAttribute("data-course", course);
  await expect(shared.getByTestId("challenge-beat")).toHaveText(fill(flight.challenge.beat, { by: "Ana", time: "12.34" }));
  // the day's board: with no database on this deployment it says so instead of breaking
  await expect(main(page).getByText(data.leaderboard.title, { exact: true })).toBeVisible();
  await expect(main(page).getByText(data.leaderboard.offTitle)).toBeVisible();

  // an old day's link flies that day's challenge
  await openFly(page, `/en/drones/${craft}/fly?challenge=2026-01-01`);
  await expect(challengeCard(page)).toHaveAttribute("data-date", "2026-01-01");
  expect(errors).toEqual([]);
});
