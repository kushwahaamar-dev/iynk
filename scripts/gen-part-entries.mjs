// Writes the fidelity entries of the shipped parts: node scripts/gen-part-entries.mjs [--check]
// Reads every flat src/parts/data/*.component.json and writes src/sim/registry/data/parts.generated.json.
// With --check it exits 1 when the committed file differs. Imports the TypeScript source with Node's type stripping.
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { entryFromDescriptor } from "../src/sim/registry/from-descriptor.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const partsDir = join(root, "src", "parts", "data");
const outFile = join(root, "src", "sim", "registry", "data", "parts.generated.json");

export function render() {
  const entries = readdirSync(partsDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".component.json"))
    .map((e) => entryFromDescriptor(JSON.parse(readFileSync(join(partsDir, e.name), "utf8")), "core"))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return `${JSON.stringify({ entries }, null, 2)}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const next = render();
  if (process.argv.includes("--check")) {
    if (!existsSync(outFile) || readFileSync(outFile, "utf8") !== next) {
      console.error("src/sim/registry/data/parts.generated.json is out of date; run node scripts/gen-part-entries.mjs");
      process.exit(1);
    }
  } else if (!existsSync(outFile) || readFileSync(outFile, "utf8") !== next) {
    writeFileSync(outFile, next);
  }
}
