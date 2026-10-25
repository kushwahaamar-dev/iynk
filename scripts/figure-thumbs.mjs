// Catalogue pictures: each board, bench and drone drawn by its own figure page, cut to the drawing and saved as a
// WebP with a clear background for the index cards (public/thumbs/<kind>/<id>.webp). The drawing is the same in dark
// mode (only the figure's page changes), so one picture serves both. Run it after rebuilding the figures
// (cfbuild --all):
//   node scripts/figure-thumbs.mjs [boards/uno-r3,drones/quad5]
import { mkdirSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sharp = createRequire(join(root, "package.json"))("sharp");

const KINDS = ["boards", "robotics", "drones"];
const WIDTH = 720; // twice the widest card picture
const only = process.argv[2]?.split(",");
const items = KINDS.flatMap((kind) =>
  readdirSync(join(root, "public/figures", kind))
    .filter((f) => f.endsWith(".html"))
    .map((f) => `${kind}/${f.slice(0, -5)}`),
).filter((item) => !only || only.includes(item));

// Everything but the drawing goes, and so does the paper, so the card's own surface shows through.
const BARE = `
  body > :not(.stage), .stage > :not(.zwrap), .zwrap > :not(#fig) { display: none !important; }
  html, body, .stage, .zwrap, #fig { background: transparent !important; box-shadow: none !important; border: 0 !important; }
  body::before, body::after, .stage::before, .stage::after, .zwrap::before, .zwrap::after { display: none !important; }
`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 2 });
let failed = 0;
for (const item of items) {
  const [kind, id] = item.split("/");
  const out = join(root, "public/thumbs", kind);
  mkdirSync(out, { recursive: true });
  const errors = [];
  page.removeAllListeners("pageerror");
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${pathToFileURL(join(root, "public/figures", `${item}.html`)).href}?bare=1`);
  await page.waitForFunction(() => document.querySelector("#art")?.childElementCount > 0, null, { timeout: 15_000 });
  await page.addStyleTag({ content: BARE });
  await page.evaluate(() => document.documentElement.classList.add("nolabels"));
  // let the engine finish its turn-in and fades before the picture is taken
  await page.waitForFunction(() => !document.documentElement.classList.contains("cf-moving"), null, { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(900);
  const box = await page.evaluate(() => {
    const r = document.querySelector("#art").getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  const pad = 6;
  const clip = { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.width + 2 * pad, height: box.height + 2 * pad };
  const png = await page.screenshot({ clip, omitBackground: true });
  const info = await sharp(png).resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: 80, alphaQuality: 90, effort: 6 }).toFile(join(out, `${id}.webp`));
  console.log(`${item}: ${info.width}x${info.height}, ${(info.size / 1024).toFixed(1)} KiB`);
  if (errors.length) {
    failed++;
    console.error(`${item}: ${errors.join("; ")}`);
  }
}
await browser.close();
if (failed) process.exit(1);
