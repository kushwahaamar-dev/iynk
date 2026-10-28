import { afterEach, beforeEach, expect, test } from "vitest";
import { PROVIDER_KEY_HEADER, SERVER_TOKEN_HEADER, withAiAuth, withSearchAuth } from "./headers";
import { removeAllKeys, setKey } from "./store";

const AI = "iynk-canary-AI-0001-do-not-use";
const SEARCH = "iynk-canary-SEARCH-0001-do-not-use";
const TOKEN = "iynk-canary-TOKEN-0001";

beforeEach(() => localStorage.clear());
afterEach(() => {
  removeAllKeys();
  localStorage.clear();
});

test("returns null while the matching key is missing", () => {
  expect(withAiAuth()).toBeNull();
  setKey("search", SEARCH);
  expect(withAiAuth()).toBeNull();
  expect(withSearchAuth()).not.toBeNull();
  setKey("server", TOKEN);
  removeAllKeys();
  expect(withSearchAuth()).toBeNull();
});

test("each call picks its own key", () => {
  setKey("ai", AI);
  setKey("search", SEARCH);
  expect(withAiAuth()?.get(PROVIDER_KEY_HEADER)).toBe(AI);
  expect(withSearchAuth()?.get(PROVIDER_KEY_HEADER)).toBe(SEARCH);
});

test("adds the server token only when one is set", () => {
  setKey("ai", AI);
  expect(withAiAuth()?.has(SERVER_TOKEN_HEADER)).toBe(false);
  setKey("server", TOKEN);
  expect(withAiAuth()?.get(SERVER_TOKEN_HEADER)).toBe(TOKEN);
});

test("merges a plain object, an array and a Headers init", () => {
  setKey("ai", AI);
  for (const init of [
    { "content-type": "application/json" },
    [["content-type", "application/json"]] as [string, string][],
    new Headers({ "content-type": "application/json" }),
  ]) {
    const headers = withAiAuth(init);
    expect(headers?.get("content-type")).toBe("application/json");
    expect(headers?.get(PROVIDER_KEY_HEADER)).toBe(AI);
  }
});

test("does not change the headers passed in", () => {
  setKey("ai", AI);
  const init = new Headers({ accept: "application/json" });
  withAiAuth(init);
  expect(init.has(PROVIDER_KEY_HEADER)).toBe(false);
});
