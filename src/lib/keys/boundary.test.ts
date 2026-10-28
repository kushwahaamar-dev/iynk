import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { expect, test } from "vitest";

const SRC = join(process.cwd(), "src");

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

const files = sources(SRC).map((path) => ({
  name: relative(SRC, path).split(sep).join("/"),
  text: readFileSync(path, "utf8"),
}));

test("only headers.ts imports readSecret", () => {
  const users = files
    .filter(({ name, text }) => name !== "lib/keys/store.ts" && /\breadSecret\b/.test(text))
    .map(({ name }) => name);
  expect(users.filter((name) => name !== "lib/keys/headers.ts")).toEqual([]);
});

test("format.ts imports nothing and never touches the browser", () => {
  const format = files.find(({ name }) => name === "lib/keys/format.ts");
  expect(format).toBeDefined();
  expect(format?.text).not.toMatch(/^\s*(import|export\s.*\sfrom)\s/m);
  expect(format?.text).not.toMatch(/\bwindow\b|localStorage/);
});

test("the key character rule is written once", () => {
  const copies = files.filter(({ text }) => text.includes("\\x21-\\x7E")).map(({ name }) => name);
  expect(copies).toEqual(["lib/keys/format.ts"]);
});
