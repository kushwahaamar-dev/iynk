import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { EditorView } from "@codemirror/view";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "@/i18n/messages/en/studioCode.json";
import type { Diagnostic } from "@/lib/interp/errors";
import { createSession } from "@/project/session";
import { seededRandom, steppingClock } from "@/project/session.testing";
import { miniProject } from "@/studio/engine/testing/mini-scene";
import { createRecordingDoc } from "@/studio/testing/recording-doc";
import { createUiStore } from "@/studio/stores/ui";
import { CodeDock } from "./CodeDock";

const storage = { getItem: () => null, setItem: () => {} };

const SKETCH = "const int LED = 13;\nvoid setup() {\n  pinMode(LED, OUTPUT);\n}\n";

function session() {
  const state = miniProject(1, 0);
  state.sources = [{ id: "src_sketch", path: "sketch.ino", language: "arduino-cpp", role: "firmware", content: SKETCH }];
  return createSession({ state, clock: steppingClock(), rnd: seededRandom() });
}

function rig(diagnostics: Diagnostic[] = [], onRun = vi.fn()) {
  const doc = createRecordingDoc(session());
  const ui = createUiStore("prj_test", storage);
  const view = render(<CodeDock doc={doc} ui={ui} diagnostics={diagnostics} onRun={onRun} messages={messages} />);
  return { doc, onRun, ...view };
}

const viewOf = (index = 0) => EditorView.findFromDOM(document.querySelectorAll<HTMLElement>(".cm-editor")[index]!)!;
const text = (doc: ReturnType<typeof rig>["doc"]) => doc.getState().state.sources[0]!.content;

beforeEach(() => {
  vi.useFakeTimers();
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener() {}, removeEventListener() {} });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CodeDock", () => {
  it("shows a tab per source file and the firmware text", () => {
    const { doc } = rig();
    let added = false;
    act(() => {
      added = doc.commit([{ k: "source.add", source: { id: "src_notes", path: "notes.md", language: "markdown", role: "doc", content: "# Notes\n" } }], { label: "add" }).ok;
    });
    expect(added).toBe(true);
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["notes.md", "sketch.ino"]);
    expect(screen.getByRole("tab", { name: "sketch.ino" }).getAttribute("aria-selected")).toBe("true");
    expect(viewOf(1).state.doc.toString()).toBe(SKETCH);
    expect(screen.queryByText(messages.plain)).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "notes.md" }));
    expect(screen.getByText(messages.plain)).toBeTruthy();
    expect(viewOf(0).state.doc.toString()).toBe("# Notes\n");
  });

  it("commits a burst of typing as one source.edit after the pause", () => {
    const { doc } = rig();
    const before = doc.getState().revision;
    const view = viewOf();
    act(() => {
      view.dispatch({ changes: { from: 0, insert: "a" } });
      view.dispatch({ changes: { from: 1, insert: "b" } });
      view.dispatch({ changes: { from: 2, insert: "c" } });
    });
    expect(doc.commits).toHaveLength(0);
    act(() => void vi.advanceTimersByTime(500));
    expect(doc.commits).toHaveLength(1);
    expect(doc.commits[0]).toMatchObject({ label: "code.edit", batch: [{ k: "source.edit", id: "src_sketch", baseSeq: before, pos: 0, del: 0, ins: "abc" }] });
    expect(text(doc).startsWith("abcconst")).toBe(true);
  });

  it("commits pending text before Run so Run uses what is on screen", () => {
    const { doc, onRun } = rig();
    act(() => viewOf().dispatch({ changes: { from: 0, insert: "// hi\n" } }));
    fireEvent.click(screen.getByRole("button", { name: messages.run }));
    expect(onRun).toHaveBeenCalledTimes(1);
    expect(text(doc).startsWith("// hi\n")).toBe(true);
  });

  it("marks a diagnostic line with its message as text", () => {
    rig([{ kind: "syntax", message: "'ledPin' was not declared", line: 2, col: 7 }]);
    const mark = document.querySelector(".cm-problem")!;
    const label = "Error, line 2, column 7: 'ledPin' was not declared";
    expect(mark.getAttribute("aria-label")).toBe(label);
    expect(mark.getAttribute("title")).toBe(label);
    expect(document.querySelector(".cm-error-line")?.getAttribute("title")).toBe(label);
    expect(screen.getByRole("tab", { name: /Errors: 1/ })).toBeTruthy();
  });

  it("moves focus on with Escape then Tab, and indents with a plain Tab", () => {
    rig();
    const content = document.querySelector<HTMLElement>(".cm-content")!;
    content.focus();
    fireEvent.keyDown(content, { key: "Escape" });
    fireEvent.keyDown(content, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: messages.copy }));

    content.focus();
    const view = viewOf();
    act(() => view.dispatch({ selection: { anchor: 0 } }));
    fireEvent.keyDown(content, { key: "Tab" });
    expect(view.state.doc.sliceString(0, 2)).toBe("  ");
  });

  it("copies the text that is on screen", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const { doc } = rig();
    act(() => viewOf().dispatch({ changes: { from: 0, insert: "// x\n" } }));
    await act(async () => void fireEvent.click(screen.getByRole("button", { name: messages.copy })));
    expect(writeText).toHaveBeenCalledWith(text(doc));
    expect(writeText.mock.calls[0]![0].startsWith("// x\n")).toBe(true);
    expect(within(document.body).getByRole("button", { name: messages.copied })).toBeTruthy();
  });

  it("refuses an edit past the size limit and says so", () => {
    const { doc } = rig();
    const view = viewOf();
    act(() => view.dispatch({ changes: { from: 0, insert: "x".repeat(300_000) } }));
    expect(view.state.doc.length).toBe(text(doc).length);
    expect(screen.getByText(messages.tooBig)).toBeTruthy();
  });

  it("shows the cursor line and column", () => {
    rig();
    act(() => viewOf().dispatch({ selection: { anchor: 25 } }));
    expect(screen.getByText("Line 2, column 6")).toBeTruthy();
  });
});
