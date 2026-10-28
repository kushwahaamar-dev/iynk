// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Op } from "../../project/generated/types.ts";
import { lessonSession } from "../../project/session.testing.ts";
import { editToOp, firstFirmwareSource, languageOf, markersOf, mergeEdits, wholeFileOp, type TextEdit } from "./sources.ts";

const splice = (text: string, e: TextEdit) => text.slice(0, e.pos) + e.ins + text.slice(e.pos + e.del);

function seeded(seed: number) {
  let s = seed;
  return (n: number) => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s % n;
  };
}

function rig() {
  const session = lessonSession();
  const source = session.state.sources[0]!;
  const author = { actor: session.state.access.owners[0]!, kind: "user" } as const;
  const send = (op: Op) => {
    const result = session.apply([op], author);
    expect(result.ok, JSON.stringify(result)).toBe(true);
  };
  const text = () => session.state.sources.find((s) => s.id === source.id)!.content;
  return { session, source, send, text };
}

describe("editToOp", () => {
  it("names the source, the base and the range", () => {
    expect(editToOp("src_a", 7, { pos: 3, del: 2, ins: "xy" })).toEqual({ k: "source.edit", id: "src_a", baseSeq: 7, pos: 3, del: 2, ins: "xy" });
  });

  it.each([
    ["insert", { pos: 5, del: 0, ins: "XX" }],
    ["delete", { pos: 2, del: 4, ins: "" }],
    ["replace", { pos: 6, del: 3, ins: "abc\ndef" }],
    ["emoji insert", { pos: 4, del: 0, ins: "\u{1F600}" }],
  ])("%s reproduces the text through apply", (_, edit) => {
    const { session, source, send, text } = rig();
    send(editToOp(source.id, session.revision, edit));
    expect(text()).toBe(splice(source.content, edit));
  });

  it("counts an emoji as two code units", () => {
    const { session, source, send, text } = rig();
    send(editToOp(source.id, session.revision, { pos: 0, del: 0, ins: "a\u{1F600}b" }));
    send(editToOp(source.id, session.revision, { pos: 1, del: 2, ins: "" }));
    expect(text().startsWith("ab")).toBe(true);
  });

  it("replaces the whole file", () => {
    const { session, source, send, text } = rig();
    send(wholeFileOp(source.id, session.revision, source.content.length, "void setup() {}\n"));
    expect(text()).toBe("void setup() {}\n");
  });

  it("replays 500 random edits like a string model", () => {
    const { session, source, send, text } = rig();
    const pick = seeded(42);
    const pieces = ["a", "bc", "\n", "  ", "\u{1F600}", "é", "{}", ""];
    let model = source.content;
    for (let i = 0; i < 500; i++) {
      let pos = pick(model.length + 1);
      if (/[\udc00-\udfff]/.test(model[pos] ?? "") && /[\ud800-\udbff]/.test(model[pos - 1] ?? "")) pos -= 1;
      let del = pick(Math.min(6, model.length - pos + 1));
      if (/[\ud800-\udbff]/.test(model[pos + del - 1] ?? "") && /[\udc00-\udfff]/.test(model[pos + del] ?? "")) del += 1;
      const edit = { pos, del, ins: pieces[pick(pieces.length)]! + pieces[pick(pieces.length)]! };
      send(editToOp(source.id, session.revision, edit));
      model = splice(model, edit);
    }
    expect(text()).toBe(model);
  });
});

describe("mergeEdits", () => {
  it("joins typing at the end of the previous insert", () => {
    expect(mergeEdits({ pos: 5, del: 0, ins: "a" }, { pos: 6, del: 0, ins: "b" })).toEqual({ pos: 5, del: 0, ins: "ab" });
  });

  it("lets a backspace eat what was just typed, and then the old text", () => {
    const typed = mergeEdits({ pos: 5, del: 0, ins: "ab" }, { pos: 6, del: 1, ins: "" });
    expect(typed).toEqual({ pos: 5, del: 0, ins: "a" });
    expect(mergeEdits({ pos: 5, del: 0, ins: "" }, { pos: 4, del: 1, ins: "" })).toEqual({ pos: 4, del: 1, ins: "" });
  });

  it("keeps two edits that are apart", () => {
    expect(mergeEdits({ pos: 5, del: 0, ins: "a" }, { pos: 9, del: 0, ins: "b" })).toBeNull();
    expect(mergeEdits({ pos: 5, del: 0, ins: "a" }, { pos: 1, del: 2, ins: "" })).toBeNull();
  });

  it("applies the merged edit to the original text like the sequence", () => {
    const pick = seeded(7);
    for (let round = 0; round < 200; round++) {
      const original = "int main() { return 0; }\nvoid loop() {}\n";
      let model = original;
      let folded = original;
      let held: TextEdit | null = null;
      for (let i = 0; i < 8; i++) {
        const pos = Math.min(model.length, (held ? held.pos + held.ins.length : pick(model.length + 1)) + pick(3) - 1);
        const edit = { pos: Math.max(0, pos), del: pick(3), ins: ["x", "", "yz"][pick(3)]! };
        edit.del = Math.min(edit.del, model.length - edit.pos);
        model = splice(model, edit);
        const merged: TextEdit | null = held ? mergeEdits(held, edit) : null;
        if (merged) {
          held = merged;
        } else {
          if (held) folded = splice(folded, held);
          held = edit;
        }
      }
      if (held) folded = splice(folded, held);
      expect(folded).toBe(model);
    }
  });
});

describe("source helpers", () => {
  it("finds the first firmware file", () => {
    const { session } = rig();
    expect(firstFirmwareSource(session.state)?.path).toBe("sketch.ino");
    expect(firstFirmwareSource({ sources: [] })).toBeNull();
  });

  it("maps languages to highlighters and leaves the rest as text", () => {
    expect(languageOf({ language: "arduino-cpp" })).toBe("arduino-cpp");
    expect(languageOf({ language: "micropython" })).toBe("python");
    expect(languageOf({ language: "python" })).toBe("python");
    expect(languageOf({ language: "verilog" })).toBe("verilog");
    expect(languageOf({ language: "markdown" })).toBeNull();
  });

  it("turns diagnostics with a line into markers and drops the ones without", () => {
    const markers = markersOf([
      { kind: "syntax", message: "Missing ;", line: 3, col: 14, hint: "Add one." },
      { kind: "unsupported", message: "No SPI", line: 5, col: 1 },
      { kind: "limit", message: "Stopped", line: 0, col: 0 },
    ]);
    expect(markers).toEqual([
      { line: 3, col: 14, message: "Missing ; Add one.", severity: "error" },
      { line: 5, col: 1, message: "No SPI", severity: "warning" },
    ]);
  });
});
