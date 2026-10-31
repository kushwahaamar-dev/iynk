import { mkdirSync, writeFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { PERF_DEFAULT } from "../src/studio/engine/scene-fixture";
import { ELEMENT_BUDGET } from "../src/studio/engine/constants";
import type { PerfName } from "../src/components/studio/PerfHarness";
import { expect, test } from "./support/no-egress";
import { collectFrames, throttleCpu } from "./support/frames";

// RS-01 on the shipped renderer: 500 parts and 1,000 wires. The default run records the numbers and keeps to a
// three-frame ceiling; PERF_STRICT=1 in headed Chromium asserts the 20 ms of BUD-01. PERF_THROTTLE and PERF_DPR
// only record. The page is served by a build made with NEXT_PUBLIC_STUDIO_TEST=1 (playwright.config.ts).
const NAMES: PerfName[] = ["pan", "fit", "zoom", "drag", "hover"];
const FRAMES = 120;
const CEILING_MS = 50;
const STRICT_MS = 20;
const LOD_OFF_SLOWER = 1.5;

const strict = process.env.PERF_STRICT === "1";
const throttle = Number(process.env.PERF_THROTTLE ?? 1);
const dpr = Number(process.env.PERF_DPR ?? 1);
const gated = throttle === 1 && dpr === 1;
const variant = strict ? "strict" : throttle > 1 ? "t4" : dpr > 1 ? "dpr2" : "default";

test.describe.configure({ mode: "serial" });
test.use({ deviceScaleFactor: dpr });

type Summary = Awaited<ReturnType<typeof collectFrames>>;

async function open(page: Page, query = "") {
  const response = await page.goto(`/en/studio/perf${query}`);
  if (response?.status() === 404) throw new Error("build without the test flag; unset E2E_SKIP_BUILD");
  await page.waitForFunction(() => window.__iynkPerf !== undefined);
  await throttleCpu(page, throttle as 1 | 4 | 6);
}

function record(name: string, data: unknown) {
  mkdirSync(".perf", { recursive: true });
  const text = JSON.stringify(data, null, 2);
  writeFileSync(`.perf/${name}.json`, text);
  console.log(`${name}\n${text}`);
}

let zoomOn: Summary;

test("500 parts and 1,000 wires stay inside the frame budget", async ({ page, browserName }, info) => {
  const headed = info.project.use.headless === false;
  await open(page);

  const interactions = {} as Record<PerfName, Summary>;
  let fitted;
  let zoomed;
  for (const name of NAMES) {
    interactions[name] = await collectFrames(page, name, FRAMES);
    if (name === "fit") fitted = await page.evaluate(() => window.__iynkPerf!.stats());
    if (name === "zoom") zoomed = await page.evaluate(() => window.__iynkPerf!.stats());
  }
  zoomOn = interactions.zoom;

  record(`studio-perf-${variant}`, {
    browser: browserName,
    headed,
    dpr,
    throttle,
    ...(headed ? {} : { note: "headless: not comparable to RS-01" }),
    interactions,
    scene: { parts: PERF_DEFAULT.parts, wires: PERF_DEFAULT.wires, elements: fitted!.elements, lod: fitted!.lod, lodZoomed: zoomed!.lod },
  });

  expect(fitted!.items).toBeGreaterThanOrEqual(PERF_DEFAULT.parts + PERF_DEFAULT.wires);
  expect(fitted!.elements).toBeLessThanOrEqual(ELEMENT_BUDGET);
  expect([...fitted!.lod, ...zoomed!.lod].filter((n) => n > 0).length).toBeGreaterThanOrEqual(2);

  if (!gated) return;
  for (const name of NAMES) {
    expect(interactions[name].p95, `${name} p95`).toBeLessThanOrEqual(CEILING_MS);
    if (strict) expect(interactions[name].p95, `${name} p95 (strict)`).toBeLessThan(STRICT_MS);
  }
});

test("zoom with the level of detail off is recorded next to zoom with it on", async ({ page }) => {
  await open(page, "?lod=off");
  const off = await collectFrames(page, "zoom", FRAMES);
  const ratio = zoomOn.p95 > 0 ? off.p95 / zoomOn.p95 : 0;
  // HYPOTHESIS: LOD off costs at least 1.5 times the frame time. Recorded, never asserted.
  record(`studio-perf-${variant}-lod`, { zoomOn, zoomOff: off, ratio, hypothesisHeld: ratio >= LOD_OFF_SLOWER });
});
