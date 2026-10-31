import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./support/no-egress";
import { ROBOTICS_IDS } from "../src/content/ids";
import { AVAILABLE, roboticsLoaders } from "../src/content/index.generated";
import type { RoboticsContent } from "../src/content/schema";
import { LOCALES } from "../src/i18n/config";
import robotics from "../src/i18n/messages/en/robotics.json";

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /hydrat|did not match|Minified React error/i.test(message.text())) errors.push(message.text());
  });
  return errors;
}

// The figure is its own document with its own tests; this checks the host page around it.
async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude("iframe")
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

const main = (page: Page, lang = "en") => page.locator(`main#main-${lang}`);

for (const lang of LOCALES) {
  test(`the ${lang} Robotics Lab index lists all 13 benches by month`, async ({ page }) => {
    const errors = watchErrors(page);
    const response = await page.goto(`/${lang}/robotics`);
    expect(response?.status()).toBe(200);
    await expect(main(page, lang).locator("h1")).toBeVisible();
    await expect(main(page, lang).locator("article[data-bench]")).toHaveCount(ROBOTICS_IDS.length);
    await expect(main(page, lang).locator("h2")).toHaveCount(6);
    expect(errors).toEqual([]);
  });
}

test("the index reads in English, links written benches and passes axe", async ({ page }) => {
  await page.goto("/en/robotics");
  await expect(main(page).locator("h1")).toHaveText(robotics.index.title);
  for (const id of ROBOTICS_IDS) {
    const card = main(page).locator(`article[data-bench="${id}"]`);
    await expect(card.locator("h3")).toContainText(robotics.benches[id].name);
    await expect(card.locator("a")).toHaveCount(AVAILABLE.robotics.includes(id) ? 1 : 0);
  }
  await expectNoAxeViolations(page);
});

test("an unknown bench is a 404", async ({ page }) => {
  const response = await page.goto("/en/robotics/no-such-bench");
  expect(response?.status()).toBe(404);
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("the index does not scroll sideways", async ({ page }) => {
    await page.goto("/en/robotics");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

// The bench workspace needs a written bench (src/content/robotics/<id>.ts); the first one in figure order.
const benchId = AVAILABLE.robotics[0];

// Playwright loads src/ as CommonJS, so the dynamic import's `default` is the module's exports object
// ({ default: bench }) rather than the bench that loadRobotics would return in the app.
async function loadBench(id: NonNullable<typeof benchId>): Promise<RoboticsContent | null> {
  const exported = (await roboticsLoaders[id]?.())?.default as RoboticsContent | { default: RoboticsContent } | undefined;
  if (!exported) return null;
  return "default" in exported ? exported.default : exported;
}

test.describe("a bench page", () => {
  test.skip(!benchId, "no robotics bench content is written yet");

  test("renders the workspace, takes keyboard shortcuts and passes axe", async ({ page }) => {
    const errors = watchErrors(page);
    const response = await page.goto(`/en/robotics/${benchId}`);
    expect(response?.status()).toBe(200);
    const m = main(page);
    await expect(m.locator("h1")).toBeVisible();
    await expect(m.getByRole("heading", { name: robotics.steps.heading })).toBeVisible();
    await expect(m.locator("iframe")).toHaveCount(1);
    // Live status and its meters are the rail's Status tab.
    await m.getByRole("tab", { name: robotics.bench.tabs.status }).click();
    await expect(m.getByRole("heading", { name: robotics.status.heading })).toBeVisible();
    await expect(m.getByRole("meter").first()).toBeVisible();

    await m.locator("h1").click();
    await page.keyboard.press("?");
    const dialog = page.getByRole("dialog", { name: robotics.keys.heading });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);

    await page.keyboard.press("s");
    await expect(page.locator("[data-serial]:visible")).toBeFocused();

    await expectNoAxeViolations(page);
    expect(errors).toEqual([]);
  });

  test("a quiz unlocks after its step and records the score", async ({ page }) => {
    const bench = await loadBench(benchId!);
    test.skip(!bench || bench.quizzes.length === 0, "this bench has no quiz");
    const quiz = bench!.quizzes[0];
    const done = Object.fromEntries(bench!.steps.map((step) => [`robotics:${benchId}:step:${step.id}`, true]));
    await page.addInitScript((seed) => {
      window.localStorage.setItem("iynk:v1", JSON.stringify({ v: 1, done: seed, quiz: {}, best: {} }));
    }, done);
    await page.goto(`/en/robotics/${benchId}`);

    await main(page).getByRole("tab", { name: new RegExp(`^${robotics.bench.tabs.quiz}`) }).click();
    const row = main(page).locator(`[data-quiz="${quiz.id}"]`);
    await row.getByRole("button").click();
    const dialog = page.getByRole("dialog");
    for (let i = 0; i < quiz.questions.length; i += 1) {
      await dialog.getByRole("radio").first().check();
      await dialog.getByRole("button", { name: robotics.quiz.check }).click();
      await dialog.getByRole("button", { name: i + 1 < quiz.questions.length ? robotics.quiz.next : robotics.quiz.finish }).click();
    }
    await expect(dialog.locator("[data-quiz-score]")).toBeVisible();
    const saved = await page.evaluate(() => JSON.parse(window.localStorage.getItem("iynk:v1") ?? "{}"));
    expect(saved.quiz[`robotics:${benchId}:quiz:${quiz.id}`].total).toBe(quiz.questions.length);
  });
});

// The rail's steps do the figure's build buttons and its Break it tab the faults, so the figure keeps only the board's
// own buttons, Remove a part and View (F-review U3). On a phone its HUD goes too and the drawing gets the plate.
test.describe("a bench's figure", () => {
  test.skip(!benchId, "no robotics bench content is written yet");

  const STEP_BUTTONS = ["power", "upload", "strip", "pnp", "place", "solder", "break"];

  async function figureButtons(page: Page) {
    const figure = page.frameLocator("main#main-en iframe");
    await expect(figure.locator('#btns .act[data-id="view"]')).toBeVisible({ timeout: 15_000 });
    return figure;
  }

  test("keeps only the buttons no step sends", async ({ page }) => {
    await page.goto(`/en/robotics/${benchId}`);
    const figure = await figureButtons(page);
    for (const id of STEP_BUTTONS) await expect(figure.locator(`#btns .act[data-id="${id}"]`)).toBeHidden();
    await expect(figure.locator('#btns .act[data-id="remove"]')).toBeVisible();
    await expect(figure.locator("#stats")).toBeVisible();
  });

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

    test("the drawing takes most of the plate, its readings move to the rail", async ({ page }) => {
      await page.goto(`/en/robotics/${benchId}`);
      const figure = await figureButtons(page);
      for (const id of STEP_BUTTONS) await expect(figure.locator(`#btns .act[data-id="${id}"]`)).toBeHidden();
      await expect(figure.locator("#stats")).toBeHidden();
      // The art's box settles after the figure lays out again; at least half the plate's width (it was 29 %).
      await expect
        .poll(() => figure.locator("#art").evaluate((art) => art.getBoundingClientRect().width / document.documentElement.clientWidth))
        .toBeGreaterThan(0.5);

      // The Status tab names the program and every rail the HUD showed.
      await main(page).getByRole("tab", { name: robotics.bench.tabs.status }).click();
      const status = main(page).locator("section", { has: page.getByRole("heading", { name: robotics.status.heading }) });
      await expect(status.getByText(robotics.modes.pick, { exact: true })).toBeVisible();
      await expect(status.getByText(robotics.status.rails)).toBeVisible();
    });

    test("the practice tasks' Hints summary is a 44 px target", async ({ page }) => {
      await page.goto(`/en/robotics/${benchId}`);
      const hints = main(page).locator("summary", { hasText: robotics.tasks.hints }).first();
      await hints.scrollIntoViewIfNeeded();
      const box = await hints.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    });
  });
});
