import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CDPSession } from "@playwright/test";
import { writeIynk } from "../src/export/iynk";
import { bigProject } from "../src/project/testing/generators";
import { expect, test } from "./support/no-egress";
import studio from "../src/i18n/messages/en/studio.json";

// FA-08: 30 saves of a document with 500 parts and 1,000 wires. The saves are timed by the page; the main
// thread's longest task while they run is read from a DevTools trace. Chromium only.

const MAIN_THREAD = "CrRendererMain";
const SAVES = 30;
const P95_BUDGET_MS = 50;
const TASK_BUDGET_MS = 8;

interface TraceEvent {
  name: string;
  ph: string;
  pid: number;
  tid: number;
  ts: number;
  dur?: number;
  args?: { name?: string };
}

async function readStream(cdp: CDPSession, handle: string): Promise<string> {
  let text = "";
  for (;;) {
    const chunk = await cdp.send("IO.read", { handle });
    text += chunk.data;
    if (chunk.eof) return text;
  }
}

async function stopTrace(cdp: CDPSession): Promise<TraceEvent[]> {
  const done = new Promise<string>((resolve) => cdp.once("Tracing.tracingComplete", (e) => resolve(e.stream ?? "")));
  await cdp.send("Tracing.end");
  const stream = await done;
  const text = await readStream(cdp, stream);
  await cdp.send("IO.close", { handle: stream });
  const parsed = JSON.parse(text) as TraceEvent[] | { traceEvents: TraceEvent[] };
  return Array.isArray(parsed) ? parsed : parsed.traceEvents;
}

/** Main-thread tasks in the trace, as [start, end] in milliseconds. */
function mainTasks(events: TraceEvent[]): Array<[number, number]> {
  const mains = new Set(events.filter((e) => e.ph === "M" && e.name === "thread_name" && e.args?.name === MAIN_THREAD).map((e) => `${e.pid}:${e.tid}`));
  expect(mains.size, `no ${MAIN_THREAD} in the trace`).toBeGreaterThan(0);
  return events
    .filter((e) => e.name === "RunTask" && e.ph === "X" && mains.has(`${e.pid}:${e.tid}`))
    .map((e): [number, number] => [e.ts / 1000, (e.ts + (e.dur ?? 0)) / 1000]);
}

/**
 * The trace also holds the file read and the open of the picked project, which come before the first save.
 * The saves are the last `window` milliseconds of it, so only tasks that start there count.
 */
function longestTask(tasks: Array<[number, number]>, window: number): number {
  const end = Math.max(...tasks.map(([, stop]) => stop));
  return Math.max(0, ...tasks.filter(([start]) => start >= end - window).map(([start, stop]) => stop - start));
}

test("saving a 500-part, 1,000-wire project stays under budget (FA-08)", async ({ page }, testInfo) => {
  test.setTimeout(240_000);

  const file = testInfo.outputPath("save500.iynk");
  writeFileSync(file, writeIynk(bigProject(500, 1000, 1)));

  await page.goto("/en/studio");
  await expect(page.getByRole("button", { name: studio.newProject })).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("diagnostics").locator("summary").click();
  const picker = page.getByTestId("diag-save-file");
  await expect(picker).toBeEnabled({ timeout: 15_000 });

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Tracing.start", { categories: "devtools.timeline,disabled-by-default-devtools.timeline", transferMode: "ReturnAsStream" });
  await picker.setInputFiles(file);
  await expect(page.getByTestId("diag-save")).toHaveText(/p95 [\d.]+ ms over 30 saves/, { timeout: 180_000 });
  const events = await stopTrace(cdp);

  const text = (await page.getByTestId("diag-save").textContent()) ?? "";
  const p50 = Number(/p50 ([\d.]+) ms/.exec(text)?.[1]);
  const p95 = Number(/p95 ([\d.]+) ms/.exec(text)?.[1]);
  const tasks = mainTasks(events);
  const round = (ms: number) => Math.round(ms * 10) / 10;
  const longestTaskMs = round(longestTask(tasks, SAVES * p95));
  const longestAnyMs = round(longestTask(tasks, Infinity));

  mkdirSync("test-results", { recursive: true });
  writeFileSync(join("test-results", "fa08-chromium.json"), `${JSON.stringify({ p50, p95, longestTaskMs, longestAnyMs, parts: 500, wires: 1000, saves: SAVES }, null, 2)}\n`);
  console.log(`FA-08: p50 ${p50} ms, p95 ${p95} ms, longest main-thread task ${longestTaskMs} ms during the saves, ${longestAnyMs} ms in the whole trace`);

  expect(p95).toBeLessThan(P95_BUDGET_MS);
  expect(longestTaskMs).toBeLessThan(TASK_BUDGET_MS);
});
