import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import dronelab from "../src/i18n/messages/en/dronelab.json";
import flight from "../src/i18n/messages/en/flight.json";

// Drone Lab, quad5 (Fig. 01): the index, the workshop (design, build, safety tests, CLI, keyboard) and the
// flying range. The figure is the real built page (public/figures/drones/quad5.html).

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /hydrat|did not match|Minified React error/i.test(message.text()))
      errors.push(message.text());
  });
  return errors;
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

const main = (page: Page) => page.locator("main#main-en");
const tab = (page: Page, name: string) => main(page).getByRole("tab", { name, exact: true });
const fill = (template: string, params: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k]));

async function openWorkshop(page: Page) {
  await page.goto("/en/drones/quad5");
  // The figure has answered `ready` once the bench status shows a parts count.
  await expect(main(page).getByTestId("bench-status")).toContainText(/\d+\/\d+/, { timeout: 20_000 });
}

test("the index lists the 13 crafts and passes axe", async ({ page }) => {
  const errors = watchErrors(page);
  const response = await page.goto("/en/drones");
  expect(response?.status()).toBe(200);
  await expect(main(page).getByRole("heading", { level: 1, name: dronelab.index.title })).toBeVisible();
  await expect(main(page).locator("ul > li > article")).toHaveCount(13);
  const quad5 = main(page).locator('a[href="/en/drones/quad5"]');
  await expect(quad5).toBeVisible();
  await expect(main(page).getByRole("progressbar").first()).toHaveAttribute("aria-valuetext", /0 of \d+ done/);
  await expectNoAxeViolations(page);
  expect(errors).toEqual([]);
});

test.describe("quad5 workshop", () => {
  test("a design option changes the live calculation", async ({ page }) => {
    const errors = watchErrors(page);
    await openWorkshop(page);
    const tiles = main(page).getByTestId("design-tiles");
    const auw = tiles.locator('[data-tile="auw"] dd');
    const before = await auw.textContent();
    await main(page).getByLabel(dronelab.design.battery, { exact: true }).selectOption("6s1800");
    await expect(auw).not.toHaveText(before ?? "");
    await expect(auw).toHaveText(/^\d[\d,]* g$/);
    // A 2450 KV motor on 6S spins far too fast: the check says so.
    await main(page).getByLabel(dronelab.design.motors, { exact: true }).selectOption("2306-2450");
    await expect(main(page).getByText(/2,450 KV on 6S spins the props/)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("the three safety tests run on the bench", async ({ page }) => {
    test.setTimeout(90_000);
    await openWorkshop(page);
    await tab(page, dronelab.workspace.tabs.build).click();
    // the empty mat offers the same button over the figure; this is the Build tab's
    await main(page).getByRole("tabpanel").getByRole("button", { name: dronelab.build.buildForMe }).click();
    await expect(main(page).getByTestId("build-count")).toHaveText(/^Parts (\d+)\/\1$/, { timeout: 20_000 });
    await expect(main(page).getByTestId("empty-build")).toBeHidden();
    // Props come off before the motors spin on the bench.
    await main(page)
      .getByRole("button", { name: fill(dronelab.build.remove, { short: "PROPS" }), exact: true })
      .click();
    // exact: "Fit PROPS the wrong way" is offered too once the props are off
    await expect(main(page).getByRole("button", { name: fill(dronelab.build.fit, { short: "PROPS" }), exact: true })).toBeVisible();

    await tab(page, dronelab.workspace.tabs.tests).click();
    // quad5's three: smoke stopper, motor direction (props off), accelerometer calibration.
    const rows = main(page).locator("[data-test]");
    await expect(rows).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      const row = rows.nth(i);
      await row.getByRole("button").click();
      await expect(row).toHaveAttribute("data-status", "passed", { timeout: 20_000 });
    }
    await expect(main(page).getByTestId("tests-count")).toHaveText(/^Tests (\d+)\/\1$/);
    await expect(main(page).getByTestId("figure-log")).toContainText("smoke stopper");
  });

  test("the Betaflight CLI answers with real syntax and errors", async ({ page }) => {
    await openWorkshop(page);
    await tab(page, dronelab.workspace.tabs.cli).click();
    const input = main(page).getByTestId("cli-input");
    const output = main(page).getByTestId("cli-output");
    await input.fill("set motor_poles = 12");
    await input.press("Enter");
    await expect(output).toContainText("motor_poles set to 12");
    await input.fill("get motor_poles");
    await input.press("Enter");
    await expect(output).toContainText("Allowed range: 4 - 255");
    await input.fill("set p_level = 50");
    await input.press("Enter");
    await expect(output).toContainText("###ERROR IN set: INVALID NAME: p_level###");
    // Up recalls the last command.
    await input.press("ArrowUp");
    await expect(input).toHaveValue("set p_level = 50");
    await input.fill("save");
    await input.press("Enter");
    await expect(output).toContainText("# saving");
  });

  test("works from the keyboard and passes axe", async ({ page }) => {
    const errors = watchErrors(page);
    await openWorkshop(page);
    const design = tab(page, dronelab.workspace.tabs.design);
    await design.focus();
    await page.keyboard.press("ArrowRight");
    await expect(tab(page, dronelab.workspace.tabs.build)).toHaveAttribute("aria-selected", "true");
    await expect(tab(page, dronelab.workspace.tabs.build)).toBeFocused();
    await page.keyboard.press("?");
    const dialog = page.getByRole("dialog", { name: dronelab.keys.title });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(dronelab.keys.rows.arm);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await tab(page, dronelab.workspace.tabs.design).click();
    await expectNoAxeViolations(page);
    expect(errors).toEqual([]);
  });

  test("opens the fly page and arms with Space", async ({ page }) => {
    const errors = watchErrors(page);
    await openWorkshop(page);
    await main(page).getByTestId("fly-link").click();
    await expect(page).toHaveURL("/en/drones/quad5/fly");
    await expect(main(page).getByRole("heading", { level: 1 })).toContainText("Fly the");
    // all clear, the rules fold to one line that opens
    await main(page).getByRole("button", { name: new RegExp(dronelab.fly.preflight) }).click();
    await expect(main(page).getByTestId("arming-rules")).toBeVisible();
    const range = main(page).locator('iframe[src*="/figures/flight/range.html"]');
    await expect(range).toBeVisible({ timeout: 20_000 });
    await range.click();
    await page.keyboard.press("Space");
    await expect(main(page).getByRole("button", { name: flight.buttons.disarm })).toBeVisible({ timeout: 10_000 });
    expect(errors).toEqual([]);
  });
});
