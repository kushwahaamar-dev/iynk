import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./support/no-egress";
import { waitForAnimations } from "./support/settled";
import { FULL_BLINK_PRESS_BUDGET } from "../src/studio/commands/keymap";
import shell from "../src/i18n/messages/en/shell.json";
import studio from "../src/i18n/messages/en/studio.json";
import studioEdit from "../src/i18n/messages/en/studioEdit.json";
import studioHome from "../src/i18n/messages/en/studioHome.json";
import studioInspect from "../src/i18n/messages/en/studioInspect.json";
import studioRun from "../src/i18n/messages/en/studioRun.json";
import studioWire from "../src/i18n/messages/en/studioWire.json";

// R-070 on the Studio: axe at zero serious or critical in both themes, the Uno blink circuit built with the keyboard
// alone (every keydown counted, FA-12), a Tab walk at three widths that never lands under a sticky bar (WCAG 2.4.11),
// state tags that survive forced colours, and the way out of the code editor.

const REGIONS = studio.layout.regions;
// The RS-16 circuit of FA-12 is built with fewer presses than this.
const RS16_PRESS_BOUND = 40;
const WIDTHS = [320, 768, 1440] as const;
const TAB_LIMIT = 600;

type Keys = { __keys: number };
type Theme = "light" | "dark";

async function countKeys(page: Page) {
  await page.addInitScript(() => {
    const counter = window as unknown as Keys;
    counter.__keys = 0;
    window.addEventListener("keydown", () => void (counter.__keys += 1), true);
  });
}

const presses = (page: Page) => page.evaluate(() => (window as unknown as Keys).__keys);

async function openHome(page: Page) {
  await page.goto("/en/studio");
  await expect(page.getByRole("button", { name: studio.newProject })).toBeVisible({ timeout: 15_000 });
}

async function waitForWorkspace(page: Page) {
  await expect(page.getByRole("region", { name: REGIONS.canvas })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("application", { name: studio.canvas.label })).toBeFocused();
}

async function openNewProject(page: Page) {
  await openHome(page);
  await page.getByRole("button", { name: studio.newProject }).click();
  await waitForWorkspace(page);
}

async function openBlinkStarter(page: Page) {
  await openHome(page);
  await page.getByRole("list", { name: studioHome.starters.listLabel }).getByRole("button", { name: new RegExp(`^${studioHome.starters.blink.title}`) }).click();
  await waitForWorkspace(page);
}

// The way a person does it: the theme choice in the header's Settings popover.
async function setTheme(page: Page, theme: Theme) {
  const button = page.locator("header:visible").first().getByRole("button", { name: shell.settings.label });
  await button.click();
  await page.getByRole("dialog", { name: shell.settings.label }).getByRole("radio", { name: shell.theme[theme] }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  await page.keyboard.press("Escape");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  // Colours fade between themes; axe must read the settled ones.
  await waitForAnimations(page);
}

async function seriousFindings(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return results.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

async function expectAxeClean(page: Page) {
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    expect(await seriousFindings(page), `axe in the ${theme} theme`).toEqual([]);
  }
}

test.describe("axe", () => {
  test("the project list is clean in light and dark", async ({ page }) => {
    await openHome(page);
    await expectAxeClean(page);
  });

  test("the Blink workspace is clean with the Models and Problems panels open", async ({ page }) => {
    await openBlinkStarter(page);
    for (const tab of [studio.layout.tabs.models, studio.layout.tabs.problems]) {
      await page.getByRole("region", { name: REGIONS.right }).getByRole("tab", { name: tab }).click();
      await expect(page.getByRole("tabpanel", { name: tab })).toBeVisible();
      await expectAxeClean(page);
    }
  });
});

test.describe("keyboard only", () => {
  test("builds and runs the Uno blink circuit without a pointer", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await countKeys(page);
    await openNewProject(page);
    const { keyboard } = page;
    const canvas = page.getByRole("application", { name: studio.canvas.label });
    const nets = () => page.evaluate(() => window.__iynkStudioDebug!.nets());

    // A part is placed from the palette: "/" finds the search box, which keeps its last words, so Escape empties it.
    const place = async (words: string, { clear }: { clear: boolean }) => {
      await keyboard.press("/");
      await expect(page.getByRole("searchbox", { name: studioEdit.palette.search })).toBeFocused();
      if (clear) await keyboard.press("Escape");
      await keyboard.type(words);
      await keyboard.press("Tab");
      await keyboard.press("Enter");
      await expect(canvas).toBeFocused();
    };
    const wire = async (words: string) => {
      await keyboard.press("w");
      await expect(page.getByRole("combobox", { name: studioWire.pinPicker.search })).toBeFocused();
      await keyboard.type(words);
      await keyboard.press("Enter");
      await expect(canvas).toBeFocused();
    };

    await place("res", { clear: false });
    // Enter on the selected part opens the inspector at its first field; Tab twice reaches Resistance, which selects its text.
    await keyboard.press("Enter");
    await expect(page.getByRole("textbox", { name: studioInspect.identity.refdes })).toBeFocused();
    await keyboard.press("Tab");
    await keyboard.press("Tab");
    await expect(page.getByRole("textbox", { name: "Resistance" })).toBeFocused();
    await keyboard.type("330");
    await keyboard.press("Enter");
    await expect(page.getByRole("textbox", { name: "Resistance" })).toHaveValue("330Ω");
    await keyboard.press("Shift+F6");
    await expect(canvas).toBeFocused();
    await wire("d13");
    await place("led", { clear: true });

    // Part A: the RS-16 circuit (a resistor with its value edited, a wire to D13, an LED).
    const rs16 = await presses(page);
    console.log(`RS-16 circuit: ${rs16} key presses (bound ${RS16_PRESS_BOUND})`);
    expect(rs16).toBeLessThan(RS16_PRESS_BOUND);

    // Part B: the full blink circuit. A new wire is the selection, so Escape and an arrow key pick the next part.
    await wire("r1 p2");
    await keyboard.press("Escape");
    await keyboard.press("ArrowRight");
    await wire("gnd");
    await keyboard.press("Control+Enter");
    const total = await presses(page);
    console.log(`Full blink circuit: ${total} key presses (budget ${FULL_BLINK_PRESS_BUDGET})`);

    expect(await nets()).toEqual([
      ["D1.A", "R1.P2"],
      ["D1.K", "U1.GND", "U1.ICSP1_6", "U1.ICSP_6", "U1.POWER_6", "U1.POWER_7"],
      ["R1.P1", "U1.D13", "U1.ICSP_3"],
    ]);
    await expect.poll(() => page.evaluate(() => window.__iynkStudioDebug!.run().startedAtMs)).not.toBeNull();
    expect(total).toBeLessThanOrEqual(FULL_BLINK_PRESS_BUDGET);
  });
});

type Stop = { label: string; covered: string | null } | "outside" | "again";

// Where focus is now, and what, if anything, sits over its middle: a sticky or fixed bar that does not hold the focus
// itself, or nothing on screen at all. "outside" is focus out of the page, "again" a stop the walk has been to.
function focusStop(): Stop {
  const walk = window as unknown as { __walked?: Set<Element> };
  const el = document.activeElement;
  if (!(el instanceof HTMLElement) || el === document.body) return "outside";
  walk.__walked ??= new Set();
  if (walk.__walked.has(el)) return "again";
  walk.__walked.add(el);
  const label = `${el.tagName.toLowerCase()}${el.getAttribute("aria-label") ? `[${el.getAttribute("aria-label")}]` : ""}${el.textContent ? ` "${el.textContent.trim().slice(0, 30)}"` : ""}`;
  const box = el.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) return { label, covered: null };
  const x = Math.min(Math.max(box.left + box.width / 2, 0), innerWidth - 1);
  const y = Math.min(Math.max(box.top + box.height / 2, 0), innerHeight - 1);
  if (box.bottom <= 0 || box.top >= innerHeight || box.right <= 0 || box.left >= innerWidth) return { label, covered: "off screen" };
  const hit = document.elementFromPoint(x, y);
  if (!hit || el.contains(hit) || hit.contains(el)) return { label, covered: null };
  for (let node: Element | null = hit; node; node = node.parentElement) {
    const position = getComputedStyle(node).position;
    if (node.hasAttribute("data-sticky") || position === "sticky" || position === "fixed") return { label, covered: node.tagName.toLowerCase() + (node.id ? `#${node.id}` : "") };
  }
  return { label, covered: null };
}

test.describe("focus walk", () => {
  for (const width of WIDTHS) {
    test(`no stop is under a sticky bar at ${width} px`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 900 });
      await openNewProject(page);
      const hidden: string[] = [];
      let stops = 0;
      let wraps = 0;
      // Focus starts on the canvas: the walk goes round the page once, through the way out at the end.
      while (stops < TAB_LIMIT) {
        // Tab indents inside the code editor; Escape first is how a keyboard leaves it.
        if (await page.evaluate(() => document.activeElement?.closest(".cm-editor") != null)) await page.keyboard.press("Escape");
        await page.keyboard.press("Tab");
        // A stop may slide in, as the skip link does.
        await waitForAnimations(page);
        const stop = await page.evaluate(focusStop);
        if (stop === "again") break;
        if (stop === "outside") {
          if (++wraps > 1) break;
          continue;
        }
        stops++;
        if (stop.covered) hidden.push(`${stop.label} under ${stop.covered}`);
      }
      console.log(`${width} px: ${stops} stops`);
      expect(stops, "Tab came back to a stop it had seen").toBeLessThan(TAB_LIMIT);
      expect(stops, "Tab found controls").toBeGreaterThan(5);
      expect(hidden).toEqual([]);
    });
  }
});

test.describe("forced colours", () => {
  test("the live state of a run is still written as text", async ({ page }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openBlinkStarter(page);
    await page.getByRole("toolbar", { name: studio.topBar.label }).getByRole("button", { name: studioRun.bar.run, exact: true }).click();
    await expect(page.getByRole("group", { name: studio.canvas.status.label }).getByText(studioRun.phase.running)).toBeVisible({ timeout: 15_000 });
    // The LED and the pin carry their level as words on the canvas, not only as colour.
    await expect(page.getByRole("application", { name: studio.canvas.label }).locator("svg text").filter({ hasText: new RegExp(`^(${studioRun.overlay.on}|${studioRun.overlay.off})$`) }).first()).toBeAttached();
  });
});

test.describe("code editor", () => {
  test("Escape then Tab leaves the editor", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openBlinkStarter(page);
    const editor = page.locator(".cm-content");
    await editor.focus();
    await expect(editor).toBeFocused();
    await page.keyboard.press("Escape");
    await page.keyboard.press("Tab");
    await expect(editor).not.toBeFocused();
    expect(await page.evaluate(() => document.activeElement?.closest(".cm-editor") ?? null)).toBeNull();
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false);
  });
});
