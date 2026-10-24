// Copies the IDL and TypeScript types written by `anchor build` into the app,
// where hx:solana-app imports them from src/lib/solana/idl.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const workspace = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(workspace, "..", "src", "lib", "solana", "idl");
const files = [
  ["target/idl/simlab_passport.json", "simlab_passport.json"],
  ["target/types/simlab_passport.ts", "simlab_passport.ts"],
];

mkdirSync(outDir, { recursive: true });
for (const [from, to] of files) {
  const source = join(workspace, from);
  if (!existsSync(source)) {
    console.error(`export-idl: ${from} is missing; run anchor build first`);
    process.exit(1);
  }
  const target = join(outDir, to);
  const unchanged = existsSync(target) && readFileSync(target).equals(readFileSync(source));
  if (!unchanged) copyFileSync(source, target);
  console.log(`export-idl: ${relative(workspace, target)} ${unchanged ? "up to date" : "updated"}`);
}
