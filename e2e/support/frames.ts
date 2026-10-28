import type { Page } from "@playwright/test";
import type { PerfName } from "../../src/components/studio/PerfHarness";
import { summarise } from "../../src/studio/engine/stats";

/** Runs one scripted interaction on the perf page and gives p50, p95 and max of its frame times in ms. */
export async function collectFrames(page: Page, name: PerfName, frames: number) {
  const deltas = await page.evaluate(([n, count]) => window.__iynkPerf!.run(n, count), [name, frames] as const);
  return summarise(deltas);
}
