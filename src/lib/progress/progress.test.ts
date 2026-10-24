import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { progressKey, progressPrefix } from "./keys";
import { count, countKeys, getBest, getQuiz, isDone, markDone, recordBest, recordQuiz, resetProgress } from "./progress";
import { EMPTY_SAVED, STORAGE_KEY, getSaved, migrate, subscribeSaved } from "./storage";

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

test("keys follow D7", () => {
  expect(progressKey.boardLesson("uno-r3", "blink")).toBe("board:uno-r3:lesson:blink");
  expect(progressKey.boardAssembly("nano")).toBe("board:nano:assembly");
  expect(progressKey.roboticsTask("reaction-timer", "debounce")).toBe("robotics:reaction-timer:task:debounce");
  expect(progressKey.droneCourse("quad5", "gates")).toBe("drone:quad5:course:gates");
  expect(progressPrefix.boardLessons("uno-r3")).toBe("board:uno-r3:lesson:");
});

test("markDone saves a versioned document and isDone reads it", () => {
  const key = progressKey.boardLesson("uno-r3", "blink");
  expect(isDone(key)).toBe(false);
  markDone(key);
  expect(isDone(key)).toBe(true);
  expect(stored()).toMatchObject({ v: 1, done: { [key]: true }, quiz: {}, best: {}, settings: { theme: "system" } });
});

test("getSaved returns the same object until storage changes", () => {
  const first = getSaved();
  expect(getSaved()).toBe(first);
  markDone("board:nano:lesson:blink");
  const second = getSaved();
  expect(second).not.toBe(first);
  expect(getSaved()).toBe(second);
});

test("count shows done/total for a prefix and never passes the total", () => {
  markDone("board:uno-r3:lesson:a");
  markDone("board:uno-r3:lesson:b");
  markDone("board:uno-r3:assembly");
  markDone("board:nano:lesson:a");
  expect(count(progressPrefix.boardLessons("uno-r3"), 16)).toEqual({ done: 2, total: 16 });
  expect(count(progressPrefix.item("board", "uno-r3"), 17)).toEqual({ done: 3, total: 17 });
  expect(count(progressPrefix.lab("board"), 2)).toEqual({ done: 2, total: 2 });
  expect(countKeys(["board:uno-r3:lesson:a", "board:uno-r3:lesson:z"])).toEqual({ done: 1, total: 2 });
});

test("recordQuiz keeps the best attempt", () => {
  const key = progressKey.roboticsQuiz("uno-build", "power");
  expect(recordQuiz(key, 2, 4)).toEqual({ score: 2, total: 4 });
  expect(recordQuiz(key, 1, 4)).toEqual({ score: 2, total: 4 });
  expect(recordQuiz(key, 4, 4)).toEqual({ score: 4, total: 4 });
  expect(getQuiz(key)).toEqual({ score: 4, total: 4 });
  expect(() => recordQuiz(key, 5, 4)).toThrow(RangeError);
});

test("recordBest keeps the better value in the given direction", () => {
  expect(recordBest("robotics:reaction-timer:task:best-ms", 320, "lower")).toBe(true);
  expect(recordBest("robotics:reaction-timer:task:best-ms", 400, "lower")).toBe(false);
  expect(recordBest("robotics:reaction-timer:task:best-ms", 250, "lower")).toBe(true);
  expect(getBest("robotics:reaction-timer:task:best-ms")).toBe(250);
  expect(recordBest("drone:quad5:course:gates:score", 10, "higher")).toBe(true);
  expect(recordBest("drone:quad5:course:gates:score", 8, "higher")).toBe(false);
});

test("resetProgress clears one prefix and keeps settings", () => {
  markDone("board:uno-r3:lesson:a");
  markDone("drone:quad5:build");
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored(), settings: { ...stored().settings, theme: "dark" } }));
  resetProgress("board:");
  expect(isDone("board:uno-r3:lesson:a")).toBe(false);
  expect(isDone("drone:quad5:build")).toBe(true);
  expect(getSaved().settings.theme).toBe("dark");
});

describe("reading what is stored", () => {
  test("junk and unknown shapes read as nothing saved", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(getSaved()).toBe(EMPTY_SAVED);
    expect(migrate(null)).toBe(EMPTY_SAVED);
    expect(migrate([1, 2])).toBe(EMPTY_SAVED);
  });

  test("bad entries are dropped, good ones kept", () => {
    const saved = migrate({
      v: 1,
      done: { "board:nano:lesson:a": true, "board:nano:lesson:b": "yes" },
      quiz: { good: { score: 3, total: 4 }, bad: { score: 9, total: 4 }, worse: 7 },
      best: { ok: 12.5, nan: "fast" },
      settings: { theme: "neon", sound: false, lofi: "on" },
    });
    expect(saved.done).toEqual({ "board:nano:lesson:a": true });
    expect(saved.quiz).toEqual({ good: { score: 3, total: 4 } });
    expect(saved.best).toEqual({ ok: 12.5 });
    expect(saved.settings).toEqual({ theme: "system", sound: false, lofi: false, labels: true, reduceMotion: false });
  });
});

test("another tab's write reaches subscribers through the storage event", () => {
  const listener = vi.fn();
  const unsubscribe = subscribeSaved(listener);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, done: { "drone:whoop:build": true } }));
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  expect(listener).toHaveBeenCalledTimes(1);
  expect(isDone("drone:whoop:build")).toBe(true);
  window.dispatchEvent(new StorageEvent("storage", { key: "something-else" }));
  expect(listener).toHaveBeenCalledTimes(1);
  unsubscribe();
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  expect(listener).toHaveBeenCalledTimes(1);
});

test("when storage refuses writes, the session still remembers", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("quota", "QuotaExceededError");
  });
  markDone("board:pico:lesson:blink");
  expect(isDone("board:pico:lesson:blink")).toBe(true);
});
