import { expect, test, type Page } from "@playwright/test";
import boardlab from "../src/i18n/messages/en/boardlab.json";
import common from "../src/i18n/messages/en/common.json";
import dronelab from "../src/i18n/messages/en/dronelab.json";

// Sound (BUILD-PLAN §3.1): off by default and silent, on from the Sound button, and then the
// lab's cue, the drone figure's build sounds and a sketch's tone() pitch all reach Web Audio.

type Probe = { contexts: number; states: string[]; started: { type: string; hz: number | null }[] };

/** Counts what the page asks of Web Audio: contexts made and every source started. */
function probeAudio() {
  const w = window as unknown as { __audio: Probe; __ctx?: AudioContext };
  w.__audio = { contexts: 0, states: [], started: [] };
  const Real = window.AudioContext;
  window.AudioContext = class extends Real {
    constructor(options?: AudioContextOptions) {
      super(options);
      w.__audio.contexts += 1;
      w.__ctx = this;
    }
  };
  const start = AudioScheduledSourceNode.prototype.start;
  AudioScheduledSourceNode.prototype.start = function (this: AudioScheduledSourceNode, ...args: Parameters<typeof start>) {
    const osc = this instanceof OscillatorNode ? this : null;
    w.__audio.started.push({ type: osc ? osc.type : "noise", hz: osc ? osc.frequency.value : null });
    return start.apply(this, args);
  };
}

const audio = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __audio: Probe; __ctx?: AudioContext };
    return { ...w.__audio, state: w.__ctx?.state ?? null };
  });

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

const main = (page: Page) => page.locator("main#main-en");
const toggle = (page: Page) => main(page).getByTestId("sound-toggle");

test("sound is off by default; on, the cue and the drone figure's build sounds play", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await page.addInitScript(probeAudio);
  await page.goto("/en/drones/quad5");
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");
  await expect(toggle(page)).toHaveAccessibleName(common.client.sound.label);

  await main(page).getByRole("tab", { name: dronelab.workspace.tabs.build, exact: true }).click();
  const buildForMe = main(page).getByRole("button", { name: dronelab.build.buildForMe });
  await expect(buildForMe).toBeEnabled({ timeout: 20_000 });
  await buildForMe.click();
  await expect(main(page).getByTestId("build-count")).toHaveText(/^Parts (\d+)\/\1$/, { timeout: 20_000 });
  // The build made its sounds while sound was off: none reached Web Audio.
  expect(await audio(page)).toMatchObject({ contexts: 0, started: [] });

  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => (await audio(page)).state).toBe("running");
  const afterCue = (await audio(page)).started.length;
  expect(afterCue).toBeGreaterThan(0);

  await main(page).getByRole("button", { name: dronelab.build.takeApart }).click();
  await buildForMe.click();
  await expect(main(page).getByTestId("build-count")).toHaveText(/^Parts (\d+)\/\1$/, { timeout: 20_000 });
  await expect.poll(async () => (await audio(page)).started.length, { timeout: 10_000 }).toBeGreaterThan(afterCue + 2);
  expect((await audio(page)).contexts).toBe(1);

  // The setting is kept: still on after a reload.
  await page.reload();
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});

test("a lesson's tone() melody plays its pitches once sound is on", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);
  await page.addInitScript(probeAudio);
  await page.goto("/en/boards/uno-r3/sound");
  await expect(main(page).locator(".cm-content")).toBeVisible({ timeout: 20_000 });
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");

  await main(page).getByTestId("run-button").click();
  await expect(main(page).getByTestId("serial-status")).toHaveText(boardlab.serial.status.running, { timeout: 15_000 });
  // The scale starts on C4 (262 Hz) and climbs: the buzzer's square wave holds each note.
  await expect
    .poll(async () => (await audio(page)).started.filter((s) => s.type === "square").map((s) => Math.round(s.hz ?? 0)), { timeout: 15_000 })
    .toEqual(expect.arrayContaining([262]));
  await main(page).getByTestId("run-button").click();
  expect(errors).toEqual([]);
});
