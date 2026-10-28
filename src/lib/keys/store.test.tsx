import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { STORAGE_KEY } from "@/lib/progress";
import { KEYS_STORAGE_KEY, getMasked, readSecret, redact, removeAllKeys, removeKey, setKey, useKeys } from "./store";

const KEY = "iynk-canary-KEY-0001-do-not-use";
const TOKEN = "iynk-canary-TOKEN-0001";

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  removeAllKeys();
  localStorage.clear();
});

test("sets, masks and removes a key", () => {
  expect(setKey("ai", KEY, "mine")).toEqual({ ok: true });
  expect(getMasked("ai")).toEqual({ kind: "ai", set: true, tail: "-use", label: "mine", persisted: true });
  expect(JSON.stringify(getMasked("ai"))).not.toContain(KEY);
  expect(readSecret("ai")).toBe(KEY);

  removeKey("ai");
  expect(getMasked("ai").set).toBe(false);
  expect(localStorage.getItem(KEYS_STORAGE_KEY)).toBeNull();
});

test("keeps the three slots apart and clears them together", () => {
  setKey("ai", KEY);
  setKey("search", "search-key-0001");
  setKey("server", TOKEN);
  removeKey("search");
  expect(getMasked("search").set).toBe(false);
  expect(readSecret("server")).toBe(TOKEN);
  removeAllKeys();
  expect(getMasked("ai").set).toBe(false);
  expect(getMasked("server").set).toBe(false);
});

test("hides the tail of a short secret", () => {
  setKey("search", "short-key-1");
  expect(getMasked("search")).toMatchObject({ set: true, tail: "" });
});

test("an empty label is stored as no label and a long one is cut", () => {
  setKey("ai", KEY, "   ");
  expect(getMasked("ai").label).toBeUndefined();
  setKey("ai", KEY, "x".repeat(60));
  expect(getMasked("ai").label).toHaveLength(40);
});

test("reports why a secret was refused", () => {
  expect(setKey("ai", "short")).toEqual({ ok: false, reason: "empty" });
  expect(setKey("ai", "a".repeat(513))).toEqual({ ok: false, reason: "too_long" });
  expect(setKey("ai", "Bearer abcdefgh")).toEqual({ ok: false, reason: "bad_chars" });
  expect(getMasked("ai").set).toBe(false);
});

test("keeps the key in memory when storage refuses the write", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("full", "QuotaExceededError");
  });
  expect(setKey("ai", KEY)).toEqual({ ok: true });
  expect(getMasked("ai")).toMatchObject({ set: true, persisted: false });
  expect(readSecret("ai")).toBe(KEY);
  expect(localStorage.getItem(KEYS_STORAGE_KEY)).toBeNull();
});

test("a storage event from another tab updates the snapshot", () => {
  const { result } = renderHook(() => useKeys());
  expect(result.current.ai.set).toBe(false);
  act(() => {
    localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify({ v: 1, ai: { key: KEY }, search: null, server: null }));
    window.dispatchEvent(new StorageEvent("storage", { key: KEYS_STORAGE_KEY }));
  });
  expect(result.current.ai).toMatchObject({ set: true, tail: "-use" });
});

test("useKeys returns the same object until a key changes", () => {
  const { result, rerender } = renderHook(() => useKeys());
  const first = result.current;
  rerender();
  expect(result.current).toBe(first);
  act(() => {
    setKey("ai", KEY);
  });
  expect(result.current).not.toBe(first);
});

test("ignores a document with the wrong version or shape", () => {
  localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify({ v: 2, ai: { key: KEY } }));
  expect(getMasked("ai").set).toBe(false);
  localStorage.setItem(KEYS_STORAGE_KEY, "not json");
  expect(getMasked("ai").set).toBe(false);
});

test("redact removes every stored secret, longest first", () => {
  setKey("ai", KEY);
  setKey("server", TOKEN);
  const out = redact(`failed with ${KEY} and again ${KEY}; token ${TOKEN}`);
  expect(out).toBe("failed with [key] and again [key]; token [key]");
});

test("the canary never reaches the progress document", () => {
  setKey("ai", KEY, "mine");
  setKey("server", TOKEN);
  expect(localStorage.getItem(STORAGE_KEY) ?? "").not.toContain("canary");
  expect(localStorage.getItem(KEYS_STORAGE_KEY)).toContain(KEY);
});
