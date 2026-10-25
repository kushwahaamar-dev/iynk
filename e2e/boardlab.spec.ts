import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { LOCALES, htmlLang } from "../src/i18n/config";
import boardlab from "../src/i18n/messages/en/boardlab.json";
import common from "../src/i18n/messages/en/common.json";

// Board Lab, Uno R3: the board index, the board workspace, and the Blink lesson
// running the learner's own code (Run → upload → the figure's LED and the serial
// monitor follow the interpreter), by mouse and by keyboard only, with axe.

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /hydrat|did not match|Minified React error/i.test(message.text())) errors.push(message.text());
  });
  return errors;
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    // The figure page is checked by its own figure tests (cfshoot); this checks the host page.
    .exclude("iframe")
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

// A board whose prose is still English only in some language (none once every translation lands).
const i18n = join(process.cwd(), "src/i18n");
const untranslated = LOCALES.filter((lang) => lang !== "en")
  .flatMap((lang) => readdirSync(join(i18n, "content/en/boards")).map((file) => ({ lang, id: file.replace(/\.json$/, "") })))
  .find(({ lang, id }) => !existsSync(join(i18n, "content", lang, "boards", `${id}.json`)));
type Notice = { untranslated: { title: string } };
type Prose = { title: string };
const readJson = <T,>(path: string): T => JSON.parse(readFileSync(join(i18n, path), "utf8")) as T;

const main = (page: Page) => page.locator("main#main-en");
const serialStatus = (page: Page) => main(page).getByTestId("serial-status");
const serialLines = (page: Page) => main(page).getByTestId("serial-lines");

async function openBlink(page: Page) {
  await page.goto("/en/boards/uno-r3/blink");
  await expect(main(page).getByTestId("lesson-workspace")).toBeVisible();
  // CodeMirror has mounted once the editor's content is editable.
  await expect(main(page).locator(".cm-content")).toBeVisible({ timeout: 20_000 });
}

test.describe("Board Lab", () => {
  test("the index lists the boards with lesson progress as done/total", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/en/boards");
    await expect(main(page).getByRole("heading", { level: 1, name: boardlab.index.title })).toBeVisible();
    const uno = main(page).locator('[data-board="uno-r3"]');
    await expect(uno).toBeVisible();
    await expect(uno.getByTestId("progress-uno-r3")).toContainText(/0\/16/);
    await expectNoAxeViolations(page);
    expect(errors).toEqual([]);
  });

  test("the Uno R3 workspace has the figure, pinout, assembly and 16 lessons", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/en/boards/uno-r3");
    await expect(main(page).getByTestId("board-workspace")).toBeVisible();
    await expect(main(page).locator("iframe")).toHaveCount(1);
    await expect(main(page).getByTestId("board-lessons").locator("li")).toHaveCount(16);
    // Assembly sits in the rail beside the figure, the pinout in the reference tabs under it.
    await main(page).getByRole("tab", { name: boardlab.index.assembly }).click();
    await expect(main(page).getByTestId("assembly-panel")).toBeVisible();
    await main(page).getByRole("tab", { name: boardlab.pinout.title }).click();
    await expect(main(page).getByTestId("pinout").locator("tbody tr").first()).toBeVisible();
    await expectNoAxeViolations(page);
    expect(errors).toEqual([]);
  });

  test("Blink: Run uploads, the LED follows D13 and the serial monitor shows the run", async ({ page }) => {
    const errors = watchErrors(page);
    await openBlink(page);
    await expect(serialStatus(page)).toHaveText(boardlab.serial.status.stopped);
    await main(page).getByTestId("run-button").click();
    await expect(serialStatus(page)).toHaveText(boardlab.serial.status.running, { timeout: 10_000 });
    await expect(serialLines(page)).toContainText(boardlab.serial.upload.compiling);
    await expect(serialLines(page)).toContainText(boardlab.serial.upload.uploading.replace("{board}", "Arduino Uno R3"));
    await expect(serialLines(page)).toContainText(boardlab.serial.upload.done);

    // The interpreter drives D13; the readout shows it as text and it changes over time.
    const d13 = main(page).locator('[data-testid="pin-readout"] [data-pin="D13"]');
    await expect(d13).toBeVisible({ timeout: 5_000 });
    const first = await d13.getAttribute("data-level");
    await expect(d13).not.toHaveAttribute("data-level", first ?? "", { timeout: 5_000 });

    // The figure itself reports its LED (the L LED on D13, or the breadboard LED) switching.
    const readout = main(page).getByTestId("figure-readout");
    await expect(readout).toBeVisible({ timeout: 15_000 });
    const lit = readout.locator('[data-on="1"], [data-state="ok"]');
    const dark = readout.locator('[data-on="0"], [data-state="off"]');
    await expect(lit.first()).toBeVisible({ timeout: 5_000 });
    await expect(dark.first()).toBeVisible({ timeout: 5_000 });

    await main(page).getByTestId("run-button").click();
    await expect(serialStatus(page)).toHaveText(boardlab.serial.status.stopped);
    await expect(serialLines(page)).toContainText(boardlab.serial.upload.stopped);
    expect(errors).toEqual([]);
  });

  test("edited code really runs: a new Serial.println appears in the monitor", async ({ page }) => {
    await openBlink(page);
    const editor = main(page).locator(".cm-content");
    await editor.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.insertText('void setup() {\n  Serial.begin(9600);\n  Serial.println("edited and running");\n}\n\nvoid loop() {}\n');
    await page.keyboard.press("Escape");
    await main(page).getByTestId("run-button").click();
    await expect(serialLines(page)).toContainText("edited and running", { timeout: 10_000 });
  });

  test("a compile error is reported with its line and nothing runs", async ({ page }) => {
    await openBlink(page);
    const editor = main(page).locator(".cm-content");
    await editor.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.insertText("void setup() {\n  pinMode(13, OUTPUT)\n}\nvoid loop() {}\n");
    await page.keyboard.press("Escape");
    await main(page).getByTestId("run-button").click();
    await expect(main(page).getByTestId("code-error")).toBeVisible({ timeout: 5_000 });
    await expect(serialStatus(page)).toHaveText(boardlab.serial.status.stopped);
  });

  test("keyboard only: Space runs and stops, ? opens the shortcuts", async ({ page }) => {
    await openBlink(page);
    // Nothing focused: the page's global shortcuts apply.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("Space");
    await expect(serialStatus(page)).toHaveText(boardlab.serial.status.running, { timeout: 10_000 });
    await page.keyboard.press("Space");
    await expect(serialStatus(page)).toHaveText(boardlab.serial.status.stopped);

    // Tab reaches the Run button and Enter presses it.
    const run = main(page).getByTestId("run-button");
    await run.focus();
    await page.keyboard.press("Enter");
    await expect(serialStatus(page)).toHaveText(boardlab.serial.status.running, { timeout: 10_000 });
    await page.keyboard.press("Enter");
    await expect(serialStatus(page)).toHaveText(boardlab.serial.status.stopped);

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("?");
    const dialog = page.getByRole("dialog", { name: boardlab.keys.title });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId("shortcuts")).toContainText(boardlab.keys.run);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // ] opens the next lesson.
    await page.keyboard.press("]");
    await expect(page).toHaveURL(/\/en\/boards\/uno-r3\/button$/);
  });

  test("the lesson page passes axe", async ({ page }) => {
    await openBlink(page);
    await expectNoAxeViolations(page);
  });

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

    // The stage rows scroll sideways inside themselves; their visually hidden labels must not widen the page.
    test("the board page and a lesson don't scroll sideways", async ({ page }) => {
      for (const path of ["/en/boards/uno-r3", "/en/boards/uno-r3/blink"]) {
        await page.goto(path);
        await expect(main(page).getByTestId("figure-readout")).toBeVisible({ timeout: 15_000 });
        const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
        expect(sw, path).toBe(cw);
      }
    });

    test("the serial monitor's resize handle is a 44 px target", async ({ page }) => {
      await openBlink(page);
      const box = await main(page).getByRole("button", { name: boardlab.serial.resize }).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    });
  });

  test("an unknown board or lesson is a 404", async ({ page }) => {
    const board = await page.goto("/en/boards/not-a-board");
    expect(board?.status()).toBe(404);
    const lesson = await page.goto("/en/boards/uno-r3/not-a-lesson");
    expect(lesson?.status()).toBe(404);
  });

  test.describe("a board whose prose is not translated yet", () => {
    test.skip(!untranslated, "every board's prose exists in every language");

    test("shows the English prose under a notice instead of a 404", async ({ page }) => {
      const { lang, id } = untranslated!;
      const errors = watchErrors(page);
      const response = await page.goto(`/${lang}/boards/${id}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", htmlLang(lang));
      await expect(page.getByRole("note").filter({ hasText: readJson<Notice>(`messages/${lang}/common.json`).untranslated.title })).toBeVisible();
      await expect(page.locator(`main#main-${lang} h1`).first()).toHaveText(readJson<Prose>(`content/en/boards/${id}.json`).title);
      expect(errors).toEqual([]);
    });

    test("the English page has no notice", async ({ page }) => {
      const { id } = untranslated!;
      await page.goto(`/en/boards/${id}`);
      await expect(main(page).locator("h1").first()).toHaveText(readJson<Prose>(`content/en/boards/${id}.json`).title);
      await expect(page.getByRole("note").filter({ hasText: common.untranslated.title })).toHaveCount(0);
    });
  });
});
