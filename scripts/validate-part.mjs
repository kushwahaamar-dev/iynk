// Validates part descriptors: node scripts/validate-part.mjs [--trust core|local|imported] [--all] [--root <dir>] <file...>
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { formatDiagnostics, validateDescriptorText } from "../src/parts/descriptor.ts";

const USAGE = "usage: node scripts/validate-part.mjs [--trust core|local|imported] [--all] [--root <dir>] <file...>";
const TRUSTS = ["core", "local", "imported"];

const files = [];
let trust = "core";
let all = false;
let root = "src/parts/data";

const args = process.argv.slice(2);
while (args.length > 0) {
  const arg = args.shift();
  if (arg === "--trust") trust = args.shift() ?? "";
  else if (arg === "--root") root = args.shift() ?? "";
  else if (arg === "--all") all = true;
  else files.push(arg);
}

if (!TRUSTS.includes(trust) || !root) {
  console.error(USAGE);
  process.exit(2);
}

if (all) {
  const flat = readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".component.json"))
    .map((e) => join(root, e.name))
    .sort();
  files.push(...flat);
}

if (files.length === 0) {
  console.error(USAGE);
  process.exit(2);
}

let failed = false;
for (const file of files) {
  let check;
  try {
    check = validateDescriptorText(readFileSync(file, "utf8"), { ctx: { trust } });
  } catch (e) {
    console.log(file);
    console.log(`  P-READ  ${e instanceof Error ? e.message : String(e)}`);
    failed = true;
    continue;
  }
  if (check.ok) {
    console.log(`ok ${file}`);
  } else {
    failed = true;
    console.log(file);
  }
  if (check.diagnostics.length > 0) {
    console.log(formatDiagnostics(check, 20).split("\n").map((l) => `  ${l}`).join("\n"));
  }
}
process.exit(failed ? 1 : 0);
