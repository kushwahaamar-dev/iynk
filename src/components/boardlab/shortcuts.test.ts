import { describe, expect, test } from "vitest";
import { shortcutFor, typingTarget } from "./shortcuts";

const plain = { ctrlKey: false, metaKey: false, altKey: false };

describe("shortcutFor", () => {
  test("] opens the next lesson and [ the previous one", () => {
    expect(shortcutFor({ key: "]", ...plain })).toEqual({ kind: "lesson", delta: 1 });
    expect(shortcutFor({ key: "[", ...plain })).toEqual({ kind: "lesson", delta: -1 });
  });

  test("a modifier turns the shortcut off", () => {
    expect(shortcutFor({ key: "]", ...plain, ctrlKey: true })).toBeNull();
  });
});

describe("typingTarget", () => {
  function el(html: string, selector: string): Element {
    document.body.innerHTML = html;
    return document.querySelector(selector)!;
  }

  test("is true inside the code editor", () => {
    expect(typingTarget(el('<div class="cm-editor"><div class="cm-content"></div></div>', ".cm-content"), "]")).toBe(true);
  });

  test("is true for an input", () => {
    expect(typingTarget(el("<input />", "input"), "]")).toBe(true);
  });

  test("is false for the body", () => {
    expect(typingTarget(document.body, "]")).toBe(false);
    expect(typingTarget(null, "]")).toBe(false);
  });

  test("a button owns Space but not ]", () => {
    const button = el("<button>Run</button>", "button");
    expect(typingTarget(button, "]")).toBe(false);
    expect(typingTarget(button, " ")).toBe(true);
  });
});
