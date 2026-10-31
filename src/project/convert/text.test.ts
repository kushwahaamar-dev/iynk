// @vitest-environment node
import { describe, expect, it } from "vitest";
import * as lab from "@/lib/boardlab/template";
import type { ParamChip } from "@/content/schema";
import { boardIds, loadBoard } from "./convert.testing.ts";
import type { LoadedBoard } from "./convert.testing.ts";
import { chipCode, defaultParams, renderTemplate, resolveText, toText, translator } from "./text.ts";
import type { Texts } from "./types.ts";

const boards: LoadedBoard[] = [];
for (const id of boardIds()) boards.push(await loadBoard(id));
const lessons = boards.flatMap((b) => b.item.data.lessons.map((lesson) => ({ board: b, lesson })));

const texts: Texts = {
  en: { "a.b": "Hello", "only.en": "Only English" },
  de: { "a.b": "Hallo" },
  es: { "a.b": "Hola" },
  fr: { "a.b": "Bonjour" },
  hi: { "a.b": "नमस्ते" },
  zh: { "a.b": "你好" },
};

describe("toText", () => {
  it("has the six languages of a key every file has", () => {
    expect(toText(texts, "a.b")).toEqual({ en: "Hello", de: "Hallo", es: "Hola", fr: "Bonjour", hi: "नमस्ते", zh: "你好" });
  });

  it("has English only when the other files lack the key", () => {
    expect(toText(texts, "only.en")).toEqual({ en: "Only English" });
  });

  it("reports a key without English text and uses the key as the text", () => {
    const missing: string[] = [];
    expect(toText(texts, "no.such.key", (k) => missing.push(k))).toEqual({ en: "no.such.key" });
    expect(missing).toEqual(["no.such.key"]);
  });

  it("does not report a key that has English text", () => {
    const missing: string[] = [];
    translator(texts, (k) => missing.push(k))("a.b");
    expect(missing).toEqual([]);
  });
});

describe("the texts of a real lesson", () => {
  it("has English and the other five languages for the title of every lesson", () => {
    for (const { board, lesson } of lessons) {
      const text = toText(board.texts, lesson.title);
      expect(Object.keys(text).sort(), `${board.item.id}/${lesson.id}`).toEqual(["de", "en", "es", "fr", "hi", "zh"]);
    }
  });
});

describe("resolveText", () => {
  it("replaces every text token and trims the key", () => {
    expect(resolveText("a {{t: a.b }} b {{t:only.en}}", (k) => texts.en[k]!)).toBe("a Hello b Only English");
  });
});

describe("renderTemplate and defaultParams against src/lib/boardlab/template.ts", () => {
  it("reads 71 lessons", () => {
    expect(lessons).toHaveLength(71);
  });

  it("renders the same starter code for every lesson with its default parameters", () => {
    for (const { board, lesson } of lessons) {
      const chips = lesson.params as unknown as ParamChip[];
      const en = (key: string) => board.texts.en[key]!;
      const old = lab.renderTemplate(lab.resolveText(lesson.code.source, en), chips, lab.defaultParams(chips)).code;
      expect(renderTemplate(lesson.code.source, lesson.params, defaultParams(lesson.params), en), `${board.item.id}/${lesson.id}`).toBe(old);
    }
  });

  it("gives the same default values and the same code text for every chip", () => {
    for (const { board, lesson } of lessons) {
      const chips = lesson.params as unknown as ParamChip[];
      const values = lab.defaultParams(chips);
      expect(defaultParams(lesson.params), `${board.item.id}/${lesson.id}`).toEqual(values);
      for (const chip of lesson.params) expect(chipCode(chip, values[chip.id]!)).toBe(lab.chipCode(chip as unknown as ParamChip, values[chip.id]!));
    }
  });

  it("applies a keepApart rule to the defaults", () => {
    const ruled = lessons.filter(({ lesson }) => lesson.params.some((c) => c.kind === "number" && c.keepApart));
    expect(ruled.length).toBeGreaterThan(0);
    for (const { lesson } of ruled) {
      const values = defaultParams(lesson.params);
      for (const chip of lesson.params) {
        if (chip.kind !== "number" || !chip.keepApart) continue;
        const { param, op, gap } = chip.keepApart;
        const a = values[chip.id] as number;
        const b = values[param] as number;
        expect(op === "<" ? a <= b - gap : a >= b + gap, `${lesson.id}.${chip.id}`).toBe(true);
      }
    }
  });

  it("writes a number with as many decimals as its step", () => {
    const chip = { id: "n", kind: "number", label: "x", default: 1, min: 0, max: 2, step: 0.25 } as const;
    expect(chipCode(chip, 1.5)).toBe("1.50");
    expect(renderTemplate("v={{p:n}};", [chip], { n: 0.5 }, () => "")).toBe("v=0.50;");
  });

  it("leaves a slot with no chip empty", () => {
    expect(renderTemplate("a{{p:zz}}b", [], {}, () => "")).toBe("ab");
  });
});
