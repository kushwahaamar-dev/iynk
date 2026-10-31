import { afterEach, expect, test, vi } from "vitest";
import { splitWords } from "./tagline-words";

afterEach(() => {
  vi.unstubAllGlobals();
});

const join = (pieces: { text: string }[]) => pieces.map((piece) => piece.text).join("");
const words = (pieces: { text: string; word: boolean }[]) => pieces.filter((piece) => piece.word).map((piece) => piece.text);

test("an English sentence splits into words with its spaces kept", () => {
  const text = "Wire it wrong, then fix it.";
  const pieces = splitWords(text, "en");
  expect(join(pieces)).toBe(text);
  expect(words(pieces)).toEqual(["Wire", "it", "wrong,", "then", "fix", "it."]);
});

test("a Chinese sentence splits into more than one word", () => {
  class StubSegmenter {
    segment(text: string) {
      return Array.from(text, (segment) => ({ segment, isWordLike: segment !== "。" }));
    }
  }
  vi.stubGlobal("Intl", { ...Intl, Segmenter: StubSegmenter });
  const text = "接错线看它失败。";
  const pieces = splitWords(text, "zh");
  expect(join(pieces)).toBe(text);
  expect(words(pieces).length).toBeGreaterThan(1);
  expect(words(pieces).at(-1)).toBe("败。");
});

test("without Intl.Segmenter it splits on spaces", () => {
  vi.stubGlobal("Intl", { ...Intl, Segmenter: undefined });
  const text = "Fix it,  then run it.";
  const pieces = splitWords(text, "en");
  expect(join(pieces)).toBe(text);
  expect(words(pieces)).toEqual(["Fix", "it,", "then", "run", "it."]);
});
