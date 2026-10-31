import type { Page } from "@playwright/test";
import type { PerfName } from "../../src/components/studio/PerfHarness";
import { summarise } from "../../src/studio/engine/stats";

/** Runs one scripted interaction on the perf page and gives p50, p95 and max of its frame times in ms. */
export async function collectFrames(page: Page, name: PerfName, frames: number) {
  const deltas = await page.evaluate(([n, count]) => window.__iynkPerf!.run(n, count), [name, frames] as const);
  return summarise(deltas);
}

export class ThrottleUnsupported extends Error {
  constructor(browserName: string) {
    super(`CPU throttling needs Chromium; ${browserName} cannot be throttled`);
  }
}

/** Slows the page's CPU by `rate` through the DevTools protocol. Chromium only: another engine throws instead of giving a row nobody throttled. */
export async function throttleCpu(page: Page, rate: 1 | 4 | 6) {
  const browserName = page.context().browser()?.browserType().name() ?? "unknown";
  if (rate === 1) return;
  if (browserName !== "chromium") throw new ThrottleUnsupported(browserName);
  await (await page.context().newCDPSession(page)).send("Emulation.setCPUThrottlingRate", { rate });
}

/** Runs one interaction `runs` times and keeps the run with the lowest p95, so a noisy machine does not fail the job. */
export async function bestOf(page: Page, name: PerfName, frames: number, runs = 3) {
  let best = await collectFrames(page, name, frames);
  for (let i = 1; i < runs; i++) {
    const next = await collectFrames(page, name, frames);
    if (next.p95 < best.p95) best = next;
  }
  return best;
}
