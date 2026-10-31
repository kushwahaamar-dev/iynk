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

test("sets, masks and removes the search key", () => {
  expect(setKey("search", KEY)).toEqual({ ok: true });
  expect(getMasked("search")).toEqual({ kind: "search", set: true, tail: "-use", persisted: true });
  expect(JSON.stringify(getMasked("search"))).not.toContain(KEY);
  expect(readSecret("search")).toBe(KEY);

  removeKey("search");
  expect(getMasked("search").set).toBe(false);
  expect(localStorage.getItem(KEYS_STORAGE_KEY)).toBeNull();
});

test("hides the tail of a short secret", () => {
  setKey("search", "short-key-1");
  expect(getMasked("search")).toMatchObject({ set: true, tail: "" });
});

test("reports why a secret was refused", () => {
  expect(setKey("search", "short")).toEqual({ ok: false, reason: "empty" });
  expect(setKey("search", "a".repeat(513))).toEqual({ ok: false, reason: "too_long" });
  expect(setKey("search", "Bearer abcdefgh")).toEqual({ ok: false, reason: "bad_chars" });
  expect(getMasked("search").set).toBe(false);
});

test("keeps the key in memory when storage refuses the write", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("full", "QuotaExceededError");
  });
  expect(setKey("search", KEY)).toEqual({ ok: true });
  expect(getMasked("search")).toMatchObject({ set: true, persisted: false });
  expect(readSecret("search")).toBe(KEY);
  expect(localStorage.getItem(KEYS_STORAGE_KEY)).toBeNull();
});

test("a storage event from another tab updates the snapshot", () => {
  const { result } = renderHook(() => useKeys());
  expect(result.current.search.set).toBe(false);
  act(() => {
    localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify({ v: 1, search: { key: KEY } }));
    window.dispatchEvent(new StorageEvent("storage", { key: KEYS_STORAGE_KEY }));
  });
  expect(result.current.search).toMatchObject({ set: true, tail: "-use" });
});

test("useKeys returns the same object until a key changes", () => {
  const { result, rerender } = renderHook(() => useKeys());
  const first = result.current;
  rerender();
  expect(result.current).toBe(first);
  act(() => {
    setKey("search", KEY);
  });
  expect(result.current).not.toBe(first);
});

test("ignores a document with the wrong version or shape", () => {
  localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify({ v: 2, search: { key: KEY } }));
  expect(getMasked("search").set).toBe(false);
  localStorage.setItem(KEYS_STORAGE_KEY, "not json");
  expect(getMasked("search").set).toBe(false);
});

test("an old document with ai and server fields loads and loses them on the next write", () => {
  localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify({ v: 1, ai: { key: KEY, label: "mine" }, search: { key: "old-search-key-0001" }, server: { token: TOKEN } }));
  expect(getMasked("search").set).toBe(true);
  expect(setKey("search", "new-search-key-0001")).toEqual({ ok: true });
  expect(JSON.parse(localStorage.getItem(KEYS_STORAGE_KEY) ?? "")).toEqual({ v: 1, search: { key: "new-search-key-0001" } });
});

test("a document with only an ai field reads as empty", () => {
  localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify({ v: 1, ai: { key: KEY }, search: null, server: null }));
  expect(getMasked("search").set).toBe(false);
  expect(setKey("search", "new-search-key-0001")).toEqual({ ok: true });
  expect(localStorage.getItem(KEYS_STORAGE_KEY)).not.toContain(KEY);
});

test("redact removes the stored search key", () => {
  setKey("search", KEY);
  expect(redact(`failed with ${KEY} and again ${KEY}`)).toBe("failed with [key] and again [key]");
});

test("the canary never reaches the progress document", () => {
  setKey("search", KEY);
  expect(localStorage.getItem(STORAGE_KEY) ?? "").not.toContain("canary");
  expect(localStorage.getItem(KEYS_STORAGE_KEY)).toContain(KEY);
});
