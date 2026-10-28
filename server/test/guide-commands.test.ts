import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { COMMANDS } from "../src/cli/commands.ts";

const guide = readFileSync(new URL("../../docs/SELF_HOSTING.md", import.meta.url), "utf8");

const FENCED = /```[^\n]*\n([\s\S]*?)```/g;
const INLINE = /`([^`\n]+)`/g;
const MENTION = /iynk-server(?:\.ts)?\s+([a-z][a-z-]*)/g;

const code = [...guide.matchAll(FENCED), ...guide.replace(FENCED, "").matchAll(INLINE)].map((match) => match[1] ?? "").join("\n");
const mentioned = new Set([...code.matchAll(MENTION)].map((match) => match[1] ?? ""));

test("every iynk-server command in the guide exists", () => {
  assert.ok(mentioned.size > 0);
  for (const name of mentioned) assert.ok(COMMANDS.includes(name), `the guide uses "iynk-server ${name}", which is not a command`);
});

test("the guide covers every command except the spelling alias", () => {
  for (const name of COMMANDS.filter((command) => command !== "enroll")) {
    assert.ok(mentioned.has(name), `the guide never shows "iynk-server ${name}"`);
  }
});
