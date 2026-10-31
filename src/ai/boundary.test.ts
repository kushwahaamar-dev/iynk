import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { expect, test } from "vitest";

const SRC = join(process.cwd(), "src");

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.(test|testing|perf\.test)\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

const files = sources(SRC).map((path) => ({
  name: relative(SRC, path).split(sep).join("/"),
  text: readFileSync(path, "utf8"),
}));

const NAMES_SECRET_READER = ["ai/custody.ts", "ai/search-key.ts", "lib/keys/headers.ts", "lib/keys/store.ts", "local/ai-profiles.ts"];

test("only the key custodians name readSecret", () => {
  const users = files.filter(({ text }) => /\breadSecret\b/.test(text)).map(({ name }) => name);
  expect(users.filter((name) => !NAMES_SECRET_READER.includes(name))).toEqual([]);
});

test("only the profile store opens the keys object store", () => {
  const users = files.filter(({ text }) => /\.objectStore\(\s*["']keys["']/.test(text)).map(({ name }) => name);
  expect(users.filter((name) => !["local/ai-profiles.ts", "local/keys-backend.ts"].includes(name))).toEqual([]);
});

test("the worker protocol has no key field", () => {
  const protocol = files.find(({ name }) => name === "ai/worker/protocol.ts");
  expect(protocol?.text).not.toMatch(/\b(key|secret|apiKey)\s*[:?]/i);
});
