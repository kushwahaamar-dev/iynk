// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { messageAt, messageKeys } from "./translate";

const english: unknown = JSON.parse(readFileSync(join(process.cwd(), "src/i18n/messages/en/home.json"), "utf8"));
const entries = messageKeys(english).map((key) => [key, String(messageAt(english, key))] as const);

const FILLER = /revolutionize|supercharge|cutting edge|effortless|transform your workflow|next level|harness|world class|seamless/i;

test("the English copy follows the copy rules", () => {
  for (const [key, text] of entries) {
    expect(text, key).not.toMatch(/!|—| - |\b[A-Za-z]+-[A-Za-z]+\b/);
    expect(text, key).not.toMatch(FILLER);
    expect(text, key).not.toMatch(/sign up|price/i);
  }
});

test("every FAQ question has an answer", () => {
  const questions = entries.filter(([key]) => /^faq\.\d+\.q$/.test(key));
  expect(questions).toHaveLength(8);
  for (const [key] of questions) expect(messageAt(english, key.replace(/q$/, "a")), key).toEqual(expect.any(String));
});

test("the hero proof line has the three counts", () => {
  expect(messageAt(english, "hero.proof")).toMatch(/\{boards\}.*\{benches\}.*\{drones\}/);
});
