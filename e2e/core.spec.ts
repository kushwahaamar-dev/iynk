import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "./support/no-egress";
import studio from "../src/i18n/messages/en/studio.json";

// The first milestone on the real page, in Chromium and WebKit: create, run the sample, kill both workers,
// save to a file, clear site data, open the file again, and go offline. The numbers it reads go to
// test-results/r048-<browser>.json for the comparison project.

const diag = studio.diag;
const WIPE_PHRASE = "wipe iynk";
const SAMPLE_NAME = "Blink an LED on D12";
const NEW_ROW = new RegExp(`^${studio.newName}(?! an)`);
const SAMPLE_ROW = new RegExp(SAMPLE_NAME);

const result = (page: Page, id: string) => page.getByTestId(`diag-${id}`);
const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const numberIn = (text: string, pattern: RegExp) => Number(pattern.exec(text)?.[1].replaceAll(",", ""));

test.beforeEach(async ({ page }) => {
  // Without the pickers the page takes the download and the plain file input, the path every browser has.
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, "showSaveFilePicker");
    Reflect.deleteProperty(window, "showOpenFilePicker");
  });
});

async function openStudio(page: Page) {
  await page.goto("/en/studio");
  await expect(button(page, studio.newProject)).toBeVisible({ timeout: 15_000 });
}

async function openDiagnostics(page: Page) {
  await page.getByTestId("diagnostics").locator("summary").click();
  await expect(button(page, diag.run.sample)).toBeEnabled({ timeout: 15_000 });
}

async function runAndRead(page: Page, name: string, id: string, done: RegExp): Promise<string> {
  await button(page, name).click();
  await expect(result(page, id)).toHaveText(done, { timeout: 90_000 });
  return (await result(page, id).textContent()) ?? "";
}

async function clearSiteData(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase("iynk");
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    });
    for (const key of await caches.keys()) await caches.delete(key);
    localStorage.clear();
  });
}

test.describe("the first milestone, headless to the page", () => {
  test("create, run, kill both workers, save to a file, lose the site data and open the file again", async ({ page, browserName }, testInfo) => {
    test.setTimeout(240_000);
    await openStudio(page);
    await expect(page.getByText(studio.list.emptyTitle)).toBeVisible();

    await button(page, studio.newProject).click();
    await expect(page.getByRole("region", { name: studio.layout.regions.canvas })).toBeVisible({ timeout: 15_000 });
    await page.goBack();
    const list = page.getByTestId("project-list");
    await expect(list.getByRole("row", { name: NEW_ROW })).toBeVisible();

    await openDiagnostics(page);

    const sample = await runAndRead(page, diag.run.sample, "sample", /Trace hash/);
    expect(sample).toMatch(/[1-9]\d* LED changes/);
    expect(sample).toContain(diag.result.noLimit);
    const traceHash = /Trace hash ([0-9a-f]{16})/.exec(sample)?.[1];
    expect(traceHash).toBeTruthy();
    const serial = /Serial: (.*)\.$/.exec(sample.replace(/ No limit hit\.$/, ""))?.[1] ?? "";

    const ten = await runAndRead(page, diag.run.ten, "ten", /of 10 equal/);
    expect(ten.trim()).toBe("10 of 10 equal");

    for (const which of ["list-repeat", "bytearray-loop", "c-array", "string-double"] as const) {
      const text = await runAndRead(page, diag.probe[which], `probe-${which}`, /Worker (still answers|does not answer)\./);
      expect(text, which).toMatch(/Ended at a limit|Worker killed and restarted/);
      expect(text, which).toContain("Worker still answers.");
    }

    // AR-15 and SA-10: the stalled worker is stopped and the page keeps painting.
    const stall = await runAndRead(page, diag.run.stall, "stall", /Longest frame gap \d+ ms\./);
    const killedMs = numberIn(stall, /killed after ([\d,]+) ms/);
    const gapMs = numberIn(stall, /Longest frame gap ([\d,]+) ms/);
    console.log(`${browserName}: ${stall}`);
    // Soft, so a slow browser still gets to the hash comparison below.
    expect.soft(killedMs, "the stalled worker is stopped within the 2 s watchdog plus its check").toBeLessThan(2500);
    expect(gapMs).toBeLessThan(100);

    // FA-07: either worker can be killed and the work is still there.
    const simKill = await runAndRead(page, diag.run.killSim, "kill-sim", /The hashes (are equal|differ)\./);
    console.log(`${browserName}: ${simKill}`);
    expect(simKill).toContain(diag.result.sameHash);
    expect(numberIn(simKill, /Recovered in ([\d,]+) ms/)).toBeLessThan(3000);
    const projectKill = await runAndRead(page, diag.run.killProject, "kill-project", /The hashes (are equal|differ)\./);
    expect(projectKill).toContain(diag.result.sameHash);

    const lessons = await runAndRead(page, diag.run.lessons, "lessons", /of 5 equal/);
    expect(lessons.trim()).toBe("5 of 5 equal");

    // Step 8: save to a file, which both browsers do as a download.
    await page.reload();
    await expect(list.getByRole("row", { name: SAMPLE_ROW })).toBeVisible({ timeout: 15_000 });
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: new RegExp(`^Save ${SAMPLE_NAME}.* to file$`) }).click();
    const file = await download;
    const saved = testInfo.outputPath("sample.iynk");
    await file.saveAs(saved);
    const envelope = JSON.parse(readFileSync(saved, "utf8")) as { hash: string };
    expect(envelope.hash).toMatch(/^[0-9a-f]{64}$/);

    // AR-17: with the site data gone, the file brings the same project back.
    await clearSiteData(page);
    await page.reload();
    await expect(page.getByText(studio.list.emptyTitle)).toBeVisible({ timeout: 15_000 });
    const chooser = page.waitForEvent("filechooser");
    await button(page, studio.openFromFile).click();
    await (await chooser).setFiles(saved);
    const reopened = list.getByRole("row", { name: SAMPLE_ROW });
    await expect(reopened).toBeVisible({ timeout: 15_000 });
    await reopened.getByRole("button", { name: `Open ${SAMPLE_NAME}` }).click();
    await expect(page.getByRole("region", { name: studio.layout.regions.canvas })).toBeVisible({ timeout: 15_000 });
    await page.goBack();

    // The saved file and the stored copy agree after a reload, too.
    await page.reload();
    await expect(list.getByRole("row", { name: SAMPLE_ROW })).toBeVisible({ timeout: 15_000 });

    mkdirSync("test-results", { recursive: true });
    writeFileSync(
      join("test-results", `r048-${browserName}.json`),
      `${JSON.stringify({ serialHash: serial, traceHash, hashes: { sample: envelope.hash } }, null, 2)}\n`,
    );
  });

  test("wipes everything on request, and works offline after one online visit (FA-09)", async ({ page, context }) => {
    test.setTimeout(240_000);
    await openStudio(page);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect(button(page, studio.newProject)).toBeVisible({ timeout: 15_000 });
    expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

    // The panel and the workers load on first use, so the worker keeps them for later by seeing them once online.
    await openDiagnostics(page);
    await runAndRead(page, diag.run.sample, "sample", /Trace hash/);
    await page.reload();
    await expect(button(page, studio.newProject)).toBeVisible({ timeout: 15_000 });

    await context.setOffline(true);
    await page.reload();
    await expect(button(page, studio.newProject)).toBeVisible({ timeout: 15_000 });

    await button(page, studio.newProject).click();
    await expect(page.getByRole("region", { name: studio.layout.regions.canvas })).toBeVisible({ timeout: 15_000 });
    await page.goBack();
    const list = page.getByTestId("project-list");
    await expect(list.getByRole("row", { name: NEW_ROW })).toBeVisible();

    await openDiagnostics(page);
    const sample = await runAndRead(page, diag.run.sample, "sample", /Trace hash/);
    expect(sample).toMatch(/[1-9]\d* LED changes/);

    await page.reload();
    await expect(list.getByRole("row", { name: NEW_ROW })).toBeVisible({ timeout: 15_000 });
    await expect(list.getByRole("row", { name: SAMPLE_ROW }).first()).toBeVisible();
    await context.setOffline(false);

    await openDiagnostics(page);
    await page.getByTestId("diag-wipe-phrase").fill(WIPE_PHRASE);
    await button(page, diag.run.wipe).click();
    await expect(result(page, "wipe")).toHaveText(/Wiped \d+ stores/, { timeout: 30_000 });
    await page.reload();
    await expect(page.getByText(studio.list.emptyTitle)).toBeVisible({ timeout: 15_000 });
  });

  test("shows New project with the diagnostics section and asks nothing outside the app origin (M1 step 1)", async ({ page }) => {
    const origins = new Set<string>();
    page.on("request", (request) => {
      if (/^https?:/.test(request.url())) origins.add(new URL(request.url()).origin);
    });
    await openStudio(page);
    await expect(page.getByTestId("diagnostics")).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect([...origins]).toEqual([new URL(page.url()).origin]);
  });
});
